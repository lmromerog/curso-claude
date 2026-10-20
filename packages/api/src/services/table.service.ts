import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError,
    TableInUseError,
    TableNotAvailableError,
    TableNotFoundError,
    TableNumberAlreadyExistsError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string
    capacity: number
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description?: string
    capacity: number
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        this.validate(dto.number, dto.capacity)
        if (!dto.restaurantId || dto.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        await this.ensureNumberIsFree(dto.restaurantId, dto.number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            number: dto.number,
            description: dto.description ?? '',
            capacity: dto.capacity,
            status: 'libre',
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        }

        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        this.validate(dto.number, dto.capacity)
        await this.ensureNumberIsFree(existing.restaurantId, dto.number, existing.id)

        const updated: Table = {
            ...existing,
            number: dto.number,
            description: dto.description ?? '',
            capacity: dto.capacity,
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.findById(restaurantId, id)
        if (existing.status === 'ocupada') {
            throw new TableInUseError()
        }
        await this.tableRepository.delete(id)
    }

    async findById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async findByRestaurantId(restaurantId: string, status?: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(
            restaurantId,
            status === undefined ? undefined : normalizeTableStatus(status)
        )
    }

    async updateStatus(restaurantId: string, id: string, status: string): Promise<Table> {
        const normalizedStatus = normalizeTableStatus(status)
        const existing = await this.findById(restaurantId, id)

        const updated: Table = { ...existing, status: normalizedStatus, updatedAt: new Date().toISOString() }
        await this.tableRepository.save(updated)
        return updated
    }

    async listAvailable(restaurantId: string, people?: number): Promise<Table[]> {
        if (people !== undefined && (!Number.isInteger(people) || people < 1)) {
            throw new InvalidTableCapacityError('El número de personas debe ser un entero mayor que 0')
        }
        return this.tableRepository.findAvailable(restaurantId, people)
    }

    async occupy(restaurantId: string, id: string): Promise<Table> {
        await this.findById(restaurantId, id)

        const occupied = await this.tableRepository.occupyIfFree(id, new Date().toISOString())
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return this.findById(restaurantId, id)
    }

    private validate(number: number, capacity: number): void {
        if (!Number.isInteger(number) || number < 1) {
            throw new InvalidTableNumberError()
        }
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw new InvalidTableCapacityError()
        }
    }

    private async ensureNumberIsFree(restaurantId: string, number: number, ownId?: string): Promise<void> {
        const sameNumber = await this.tableRepository.findByNumber(restaurantId, number)
        if (sameNumber && sameNumber.id !== ownId) {
            throw new TableNumberAlreadyExistsError()
        }
    }
}
