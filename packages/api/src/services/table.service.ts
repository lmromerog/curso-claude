import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    InvalidTableCapacityError,
    InvalidTableNumberError,
    RestaurantIdRequiredError,
    TableInUseError,
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

    async update(id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.findById(id)
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

    async delete(id: string): Promise<void> {
        const existing = await this.findById(id)
        if (existing.status === 'ocupada') {
            throw new TableInUseError()
        }
        await this.tableRepository.delete(id)
    }

    async findById(id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table) {
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

    async updateStatus(id: string, status: string): Promise<Table> {
        const normalizedStatus = normalizeTableStatus(status)
        const existing = await this.findById(id)

        const updated: Table = { ...existing, status: normalizedStatus, updatedAt: new Date().toISOString() }
        await this.tableRepository.save(updated)
        return updated
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
