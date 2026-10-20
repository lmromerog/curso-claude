import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const tokenFor = (role: string, restaurantId: string | null = 'r1') =>
    `Bearer ${jwt.sign({ id: `user-${role}`, role, restaurantId }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const admin = tokenFor('admin', null)
const manager = tokenFor('manager')
const camarero = tokenFor('camarero')
const cocinero = tokenFor('cocinero')
const cliente = tokenFor('cliente', null)

describe('Rutas de mesas (HTTP)', () => {
    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'R', 'A', 'a@a.com', '1', 'O', 'L', 'now', 'now']
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const create = (body: object, token = admin, restaurantId = 'r1') =>
        request(app).post(`/api/v1/restaurants/${restaurantId}/tables`).set('Authorization', token).send(body)

    describe('POST /restaurants/:restaurantId/tables', () => {
        it('should create a free table with 201', async () => {
            const res = await create({ number: 1, description: 'Terraza', capacity: 4 })

            expect(res.status).toBe(201)
            expect(res.body).toEqual(expect.objectContaining({ number: 1, description: 'Terraza', capacity: 4, status: 'libre', restaurantId: 'r1' }))
            expect(res.body.id).toBeTruthy()
        })

        it('should allow a manager and reject camarero with 403', async () => {
            expect((await create({ number: 2, capacity: 2 }, manager)).status).toBe(201)
            expect((await create({ number: 3, capacity: 2 }, camarero)).status).toBe(403)
        })

        it('should reject requests without token with 401', async () => {
            const res = await request(app).post('/api/v1/restaurants/r1/tables').send({ number: 9, capacity: 2 })
            expect(res.status).toBe(401)
        })

        it('should answer 409 with a Spanish message for a duplicated number', async () => {
            const res = await create({ number: 1, capacity: 2 })
            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'TableNumberAlreadyExistsError', message: 'Ya existe una mesa con ese número en el restaurante' })
        })

        it('should answer 400 for a capacity lower than 1', async () => {
            const res = await create({ number: 50, capacity: 0 })
            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidTableCapacityError', message: 'La capacidad debe ser un entero mayor que 0' })
        })
    })

    describe('GET /restaurants/:restaurantId/tables', () => {
        it('should list the tables ordered by number for admin, manager, camarero and cocinero', async () => {
            for (const token of [admin, manager, camarero, cocinero]) {
                const res = await request(app).get('/api/v1/restaurants/r1/tables').set('Authorization', token)
                expect(res.status).toBe(200)
                expect(res.body.map((t: { number: number }) => t.number)).toEqual([1, 2])
            }
        })

        it('should reject clientes with 403 and filter by status', async () => {
            expect((await request(app).get('/api/v1/restaurants/r1/tables').set('Authorization', cliente)).status).toBe(403)
            const res = await request(app).get('/api/v1/restaurants/r1/tables?status=ocupada').set('Authorization', admin)
            expect(res.body).toEqual([])
            const bad = await request(app).get('/api/v1/restaurants/r1/tables?status=rota').set('Authorization', admin)
            expect(bad.status).toBe(400)
        })
    })

    describe('GET/PUT/DELETE /restaurants/:restaurantId/tables/:id', () => {
        let id: string

        beforeAll(async () => {
            id = (await create({ number: 10, description: 'Barra', capacity: 3 })).body.id
        })

        it('should get a table for a camarero but 404 from another restaurant', async () => {
            const ok = await request(app).get(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', camarero)
            expect(ok.status).toBe(200)
            const other = await request(app).get(`/api/v1/restaurants/r2/tables/${id}`).set('Authorization', camarero)
            expect(other.status).toBe(404)
            expect(other.body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
        })

        it('should forbid cocinero from reading a single table', async () => {
            const res = await request(app).get(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', cocinero)
            expect(res.status).toBe(403)
        })

        it('should update a table with PUT', async () => {
            const res = await request(app).put(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', manager)
                .send({ number: 11, description: 'Ventana', capacity: 5 })
            expect(res.status).toBe(200)
            expect(res.body).toEqual(expect.objectContaining({ number: 11, description: 'Ventana', capacity: 5, status: 'libre' }))
        })

        it('should reject PUT from camarero with 403 and invalid capacity with 400', async () => {
            const body = { number: 11, description: '', capacity: 5 }
            expect((await request(app).put(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', camarero).send(body)).status).toBe(403)
            expect((await request(app).put(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', admin).send({ ...body, capacity: 0 })).status).toBe(400)
        })

        it('should answer 409 TableInUseError when deleting an occupied table and 204 once freed', async () => {
            await request(app).patch(`/api/v1/restaurants/r1/tables/${id}/status`).set('Authorization', camarero).send({ status: 'ocupada' })
            const blocked = await request(app).delete(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', admin)
            expect(blocked.status).toBe(409)
            expect(blocked.body.error).toBe('TableInUseError')

            await request(app).patch(`/api/v1/restaurants/r1/tables/${id}/status`).set('Authorization', camarero).send({ status: 'libre' })
            expect((await request(app).delete(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', admin)).status).toBe(204)
            expect((await request(app).delete(`/api/v1/restaurants/r1/tables/${id}`).set('Authorization', admin)).status).toBe(404)
        })
    })

    describe('PATCH /restaurants/:restaurantId/tables/:id/status', () => {
        let id: string

        beforeAll(async () => {
            id = (await create({ number: 20, capacity: 2 })).body.id
        })

        it('should change the status for admin, manager and camarero', async () => {
            for (const [token, status] of [[admin, 'reservada'], [manager, 'ocupada'], [camarero, 'libre']] as const) {
                const res = await request(app).patch(`/api/v1/restaurants/r1/tables/${id}/status`).set('Authorization', token).send({ status })
                expect(res.status).toBe(200)
                expect(res.body.status).toBe(status)
            }
        })

        it('should answer 400 for an invalid status, 403 for cocinero and 404 for a missing table', async () => {
            const bad = await request(app).patch(`/api/v1/restaurants/r1/tables/${id}/status`).set('Authorization', camarero).send({ status: 'rota' })
            expect(bad.status).toBe(400)
            expect(bad.body.error).toBe('InvalidTableStatusError')
            expect((await request(app).patch(`/api/v1/restaurants/r1/tables/${id}/status`).set('Authorization', cocinero).send({ status: 'libre' })).status).toBe(403)
            expect((await request(app).patch('/api/v1/restaurants/r1/tables/nope/status').set('Authorization', camarero).send({ status: 'libre' })).status).toBe(404)
        })
    })

    describe('GET /public/restaurants/:restaurantId/tables', () => {
        beforeAll(async () => {
            await create({ number: 30, capacity: 2 }, admin, 'r2')
            await create({ number: 31, capacity: 6 }, admin, 'r2')
            const busy = await create({ number: 32, capacity: 8 }, admin, 'r2')
            await request(app).patch(`/api/v1/restaurants/r2/tables/${busy.body.id}/status`).set('Authorization', admin).send({ status: 'ocupada' })
        })

        it('should return only free tables with enough capacity without authentication', async () => {
            const res = await request(app).get('/api/v1/public/restaurants/r2/tables?people=3')
            expect(res.status).toBe(200)
            expect(res.body.map((t: { number: number }) => t.number)).toEqual([31])
        })

        it('should return every free table when people is omitted and an empty list for unknown restaurants', async () => {
            expect((await request(app).get('/api/v1/public/restaurants/r2/tables')).body).toHaveLength(2)
            const unknown = await request(app).get('/api/v1/public/restaurants/nope/tables?people=2')
            expect(unknown.status).toBe(200)
            expect(unknown.body).toEqual([])
        })

        it('should answer 400 with a Spanish message for an invalid people value', async () => {
            for (const people of ['0', 'abc', '2.5', '-1']) {
                const res = await request(app).get(`/api/v1/public/restaurants/r2/tables?people=${people}`)
                expect(res.status).toBe(400)
                expect(res.body).toEqual({ error: 'InvalidTableCapacityError', message: 'El número de personas debe ser un entero mayor que 0' })
            }
        })
    })

    describe('POST /restaurants/:restaurantId/tables/:id/occupy', () => {
        let id: string

        beforeAll(async () => {
            id = (await create({ number: 40, capacity: 4 })).body.id
        })

        it('should forbid non-clients with 403 and anonymous requests with 401', async () => {
            expect((await request(app).post(`/api/v1/restaurants/r1/tables/${id}/occupy`).set('Authorization', camarero)).status).toBe(403)
            expect((await request(app).post(`/api/v1/restaurants/r1/tables/${id}/occupy`)).status).toBe(401)
        })

        it('should answer 404 for a missing table or one from another restaurant', async () => {
            expect((await request(app).post('/api/v1/restaurants/r1/tables/nope/occupy').set('Authorization', cliente)).status).toBe(404)
            expect((await request(app).post(`/api/v1/restaurants/r2/tables/${id}/occupy`).set('Authorization', cliente)).status).toBe(404)
        })

        it('should let only one of several concurrent clients occupy the table', async () => {
            const results = await Promise.all(
                [1, 2, 3, 4].map(() => request(app).post(`/api/v1/restaurants/r1/tables/${id}/occupy`).set('Authorization', cliente))
            )

            const statuses = results.map(r => r.status).sort()
            expect(statuses).toEqual([200, 409, 409, 409])
            const winner = results.find(r => r.status === 200)!
            expect(winner.body.status).toBe('ocupada')
            const loser = results.find(r => r.status === 409)!
            expect(loser.body).toEqual({ error: 'TableNotAvailableError', message: 'La mesa ya no está disponible' })
        })
    })
})
