import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotOccupiedError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create (mesa)', () => {
    let repo: MockOrderRepository
    let tableRepo: MockTableRepository
    let service: OrderService

    const request = (tableId: string | null) => ({
        restaurantId: 'rest-1',
        tableId,
        clientId: 'client-1',
        items: [{ dishId: 'dish-1', quantity: 1, notes: null }]
    })

    const buildTable = (id: string, status: 'libre' | 'ocupada', restaurantId = 'rest-1') => ({
        id,
        number: 1,
        description: '',
        capacity: 4,
        status,
        restaurantId,
        createdAt: 'now',
        updatedAt: 'now'
    })

    beforeEach(async () => {
        repo = new MockOrderRepository()
        tableRepo = new MockTableRepository()
        service = new OrderService(repo, tableRepo)
        await tableRepo.save(buildTable('t-ocupada', 'ocupada'))
        await tableRepo.save(buildTable('t-libre', 'libre'))
        await tableRepo.save(buildTable('t-otra', 'ocupada', 'rest-2'))
    })

    it('should create an order without table', async () => {
        const order = await service.create(request(null))
        expect(order.tableId).toBeNull()
    })

    it('should create an order for an occupied table of the restaurant', async () => {
        const order = await service.create(request('t-ocupada'))
        expect(order.tableId).toBe('t-ocupada')
    })

    it('should reject a table that does not exist', async () => {
        await expect(service.create(request('nope'))).rejects.toThrow(TableNotFoundError)
        expect(repo.orders).toHaveLength(0)
    })

    it('should reject a table from another restaurant', async () => {
        await expect(service.create(request('t-otra'))).rejects.toThrow(TableNotFoundError)
    })

    it('should reject a table that is not occupied with a Spanish message', async () => {
        await expect(service.create(request('t-libre'))).rejects.toThrow(TableNotOccupiedError)
        await expect(service.create(request('t-libre'))).rejects.toThrow('La mesa no está ocupada')
    })
})
