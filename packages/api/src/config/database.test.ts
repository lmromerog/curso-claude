import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'

describe('Database restaurant_tables', () => {
    let db: Database

    const insertTable = (id: string, restaurantId: string, number: number) =>
        db.run(
            'INSERT INTO restaurant_tables (id, number, description, capacity, status, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, number, '', 4, 'libre', restaurantId, 'now', 'now']
        )

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'R', 'A', 'a@a.com', '1', 'O', 'L', 'now', 'now']
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should create the table and accept a row', async () => {
        await insertTable('t1', 'r1', 1)
        const row = await db.get<{ status: string }>('SELECT status FROM restaurant_tables WHERE id = ?', ['t1'])
        expect(row?.status).toBe('libre')
    })

    it('should reject a duplicated number in the same restaurant', async () => {
        await expect(insertTable('t2', 'r1', 1)).rejects.toThrow(/UNIQUE/)
    })

    it('should allow the same number in another restaurant', async () => {
        await expect(insertTable('t3', 'r2', 1)).resolves.toBeDefined()
    })
})
