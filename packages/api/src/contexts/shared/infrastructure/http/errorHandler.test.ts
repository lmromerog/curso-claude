import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    InvalidTableStatusError,
    InvalidTableCapacityError,
    InvalidTableNumberError,
    TableNumberAlreadyExistsError,
    TableNotAvailableError,
    TableInUseError
} from '@errors/DomainErrors.js'

function handle(err: Error) {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    errorHandler(err, {} as any, { status } as any, vi.fn())
    return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] }
}

describe('errorHandler (mesas)', () => {
    it('should map TableNotFoundError to 404 with a Spanish message', () => {
        const { status, body } = handle(new TableNotFoundError())
        expect(status).toBe(404)
        expect(body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
    })

    it('should map TableNumberAlreadyExistsError to 409', () => {
        const { status, body } = handle(new TableNumberAlreadyExistsError())
        expect(status).toBe(409)
        expect(body.message).toBe('Ya existe una mesa con ese número en el restaurante')
    })

    it('should map TableNotAvailableError to 409', () => {
        const { status, body } = handle(new TableNotAvailableError())
        expect(status).toBe(409)
        expect(body.message).toBe('La mesa ya no está disponible')
    })

    it('should map TableInUseError to 409', () => {
        const { status, body } = handle(new TableInUseError())
        expect(status).toBe(409)
        expect(body.message).toBe('No se puede eliminar una mesa ocupada')
    })

    it('should keep 400 for invalid status, capacity and number', () => {
        expect(handle(new InvalidTableStatusError()).status).toBe(400)
        expect(handle(new InvalidTableCapacityError()).status).toBe(400)
        expect(handle(new InvalidTableNumberError()).status).toBe(400)
    })

    it('should use the contract message for invalid capacity', () => {
        expect(handle(new InvalidTableCapacityError()).body.message).toBe('La capacidad debe ser un entero mayor que 0')
    })
})
