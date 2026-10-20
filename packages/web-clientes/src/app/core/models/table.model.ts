export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  number: number
  description: string
  capacity: number
  status: TableStatus
  restaurantId: string
  createdAt: string
  updatedAt: string
}
