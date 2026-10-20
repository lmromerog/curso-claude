import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const tokenFor = (id: string, role: string) =>
    `Bearer ${jwt.sign({ id, role, restaurantId: 'r1' }, process.env.JWT_SECRET || 'super-secret-resttek-key')}`

const admin = tokenFor('admin-1', 'admin')
const cliente = tokenFor('client-1', 'cliente')

describe('Pedidos con mesa (HTTP)', () => {
    let tableId: string
    let freeTableId: string

    const createOrder = (tableId: string | null) =>
        request(app).post('/api/v1/orders').set('Authorization', cliente)
            .send({ restaurantId: 'r1', tableId, items: [{ dishId: 'd1', quantity: 1, notes: null }] })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        await dbConfig.initialize()
        await dbConfig.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'R', 'A', 'a@a.com', '1', 'O', 'L', 'now', 'now']
        )
        await dbConfig.run(
            'INSERT INTO dishes (id, name, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Plato', 10, 'principal', 1, 'r1', 'now', 'now']
        )
        const t = await request(app).post('/api/v1/restaurants/r1/tables').set('Authorization', admin).send({ number: 7, capacity: 4 })
        tableId = t.body.id
        const free = await request(app).post('/api/v1/restaurants/r1/tables').set('Authorization', admin).send({ number: 8, capacity: 4 })
        freeTableId = free.body.id
        await request(app).post(`/api/v1/restaurants/r1/tables/${tableId}/occupy`).set('Authorization', cliente)
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('should reject an order for a table that is not occupied with 400 and a Spanish message', async () => {
        const res = await createOrder(freeTableId)
        expect(res.status).toBe(400)
        expect(res.body).toEqual({ error: 'La mesa no está ocupada' })
    })

    it('should reject an order for an unknown table with 400', async () => {
        const res = await createOrder('nope')
        expect(res.status).toBe(400)
        expect(res.body).toEqual({ error: 'Mesa no encontrada' })
    })

    it('should return tableId and tableNumber when creating an order', async () => {
        const res = await createOrder(tableId)
        expect(res.status).toBe(201)
        expect(res.body).toEqual(expect.objectContaining({ tableId, tableNumber: 7 }))
    })

    it('should return tableNumber in /active, /mine and /:id', async () => {
        const created = await createOrder(tableId)

        const active = await request(app).get('/api/v1/orders/active?restaurantId=r1').set('Authorization', admin)
        expect(active.body.every((o: { tableNumber: number }) => o.tableNumber === 7)).toBe(true)
        expect(active.body.length).toBeGreaterThan(0)

        const mine = await request(app).get('/api/v1/orders/mine').set('Authorization', cliente)
        expect(mine.body[0].tableNumber).toBe(7)

        const one = await request(app).get(`/api/v1/orders/${created.body.id}`).set('Authorization', cliente)
        expect(one.body.tableNumber).toBe(7)
    })

    it('should return tableNumber null for orders without table', async () => {
        const res = await createOrder(null)
        expect(res.status).toBe(201)
        expect(res.body.tableNumber).toBeNull()
        const one = await request(app).get(`/api/v1/orders/${res.body.id}`).set('Authorization', cliente)
        expect(one.body.tableNumber).toBeNull()
    })
})
