import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import {
    TableNotFoundError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    InvalidTableStatusError,
    TableNumberAlreadyExistsError,
    TableInUseError
} from '@errors/DomainErrors.js'

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = { number: 1, description: 'Terraza', capacity: 4, restaurantId: 'r1' }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create a free table and save it', async () => {
            const result = await service.create(validInput)

            expect(result.status).toBe('libre')
            expect(result.number).toBe(1)
            expect(result.description).toBe('Terraza')
            expect(result.id).toBeTruthy()
            expect(await repo.findById(result.id)).not.toBeNull()
        })

        it('should default the description to an empty string', async () => {
            const result = await service.create({ number: 2, capacity: 2, restaurantId: 'r1' })
            expect(result.description).toBe('')
        })

        it.each([0, -1, 1.5])('should reject capacity %s', async (capacity) => {
            await expect(service.create({ ...validInput, capacity })).rejects.toThrow(InvalidTableCapacityError)
        })

        it.each([0, -3, 2.5])('should reject number %s', async (number) => {
            await expect(service.create({ ...validInput, number })).rejects.toThrow(InvalidTableNumberError)
        })

        it('should reject a duplicated number in the same restaurant', async () => {
            await service.create(validInput)
            await expect(service.create(validInput)).rejects.toThrow(TableNumberAlreadyExistsError)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validInput)
            await expect(service.create({ ...validInput, restaurantId: 'r2' })).resolves.toBeDefined()
        })
    })

    describe('update', () => {
        it('should update number, description and capacity without changing the status', async () => {
            const created = await service.create(validInput)
            await service.updateStatus(created.id, 'reservada')

            const updated = await service.update(created.id, { number: 5, description: 'Barra', capacity: 6 })

            expect(updated).toEqual(expect.objectContaining({ number: 5, description: 'Barra', capacity: 6, status: 'reservada' }))
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.update('nope', { number: 1, description: '', capacity: 2 })).rejects.toThrow(TableNotFoundError)
        })

        it('should reject an invalid capacity', async () => {
            const created = await service.create(validInput)
            await expect(service.update(created.id, { number: 1, description: '', capacity: 0 })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should reject a number used by another table but allow keeping its own', async () => {
            const a = await service.create(validInput)
            await service.create({ ...validInput, number: 2 })

            await expect(service.update(a.id, { number: 2, description: '', capacity: 4 })).rejects.toThrow(TableNumberAlreadyExistsError)
            await expect(service.update(a.id, { number: 1, description: 'x', capacity: 4 })).resolves.toBeDefined()
        })
    })

    describe('delete', () => {
        it('should delete a free table', async () => {
            const created = await service.create(validInput)
            await service.delete(created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.delete('nope')).rejects.toThrow(TableNotFoundError)
        })

        it('should throw TableInUseError when the table is occupied', async () => {
            const created = await service.create(validInput)
            await service.updateStatus(created.id, 'ocupada')
            await expect(service.delete(created.id)).rejects.toThrow(TableInUseError)
        })
    })

    describe('findByRestaurantId', () => {
        it('should return the tables of the restaurant ordered by number', async () => {
            await service.create({ ...validInput, number: 3 })
            await service.create({ ...validInput, number: 1 })
            await service.create({ ...validInput, number: 2, restaurantId: 'r2' })

            const result = await service.findByRestaurantId('r1')
            expect(result.map(t => t.number)).toEqual([1, 3])
        })

        it('should filter by status and reject an invalid one', async () => {
            const t = await service.create(validInput)
            await service.create({ ...validInput, number: 2 })
            await service.updateStatus(t.id, 'ocupada')

            expect((await service.findByRestaurantId('r1', 'ocupada')).map(x => x.id)).toEqual([t.id])
            await expect(service.findByRestaurantId('r1', 'rota')).rejects.toThrow(InvalidTableStatusError)
        })
    })

    describe('findById', () => {
        it('should return the table or throw TableNotFoundError', async () => {
            const created = await service.create(validInput)
            expect((await service.findById(created.id)).id).toBe(created.id)
            await expect(service.findById('nope')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('updateStatus', () => {
        it('should change the status from any state to any other', async () => {
            const t = await service.create(validInput)
            expect((await service.updateStatus(t.id, 'ocupada')).status).toBe('ocupada')
            expect((await service.updateStatus(t.id, 'libre')).status).toBe('libre')
        })

        it('should reject an invalid status', async () => {
            const t = await service.create(validInput)
            await expect(service.updateStatus(t.id, 'rota')).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.updateStatus('nope', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })
})
