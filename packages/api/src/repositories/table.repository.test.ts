import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const buildTable = (overrides: Partial<Table>): Table => ({
        id: 't1',
        number: 1,
        description: '',
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(buildTable({ id: 't1', number: 1, description: 'Terraza' }))

        const found = await repo.findById('t1')
        expect(found).toEqual(expect.objectContaining({ id: 't1', number: 1, description: 'Terraza', capacity: 4, status: 'libre', restaurantId: 'r1' }))
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('should update an existing table including its status', async () => {
        await repo.save(buildTable({ id: 't1', number: 1, capacity: 6, status: 'reservada' }))

        const found = await repo.findById('t1')
        expect(found?.capacity).toBe(6)
        expect(found?.status).toBe('reservada')
    })

    it('should find tables by restaurant ordered by number, optionally by status', async () => {
        await repo.save(buildTable({ id: 't3', number: 3, status: 'ocupada' }))
        await repo.save(buildTable({ id: 't2', number: 2, status: 'libre' }))
        await repo.save(buildTable({ id: 'x1', number: 1, restaurantId: 'r2' }))

        const all = await repo.findByRestaurantId('r1')
        expect(all.map(t => t.number)).toEqual([1, 2, 3])

        const occupied = await repo.findByRestaurantId('r1', 'ocupada')
        expect(occupied.map(t => t.id)).toEqual(['t3'])
    })

    it('should find a table by restaurant and number', async () => {
        const found = await repo.findByNumber('r1', 2)
        expect(found?.id).toBe('t2')
        expect(await repo.findByNumber('r2', 2)).toBeNull()
    })

    it('should find only free tables with enough capacity ordered by capacity and number', async () => {
        await repo.save(buildTable({ id: 't4', number: 4, capacity: 2, status: 'libre' }))
        await repo.save(buildTable({ id: 't5', number: 5, capacity: 8, status: 'libre' }))
        await repo.save(buildTable({ id: 't2', number: 2, capacity: 4, status: 'libre' }))

        const available = await repo.findAvailable('r1', 3)
        expect(available.map(t => t.id)).toEqual(['t2', 't5'])

        const noFilter = await repo.findAvailable('r1')
        expect(noFilter.map(t => t.id)).toEqual(['t4', 't2', 't5'])
    })

    it('should delete a table', async () => {
        await repo.delete('t5')
        expect(await repo.findById('t5')).toBeNull()
    })
})
