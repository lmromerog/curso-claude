import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { Restaurant } from '../../core/models/restaurant.model'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Cargando...' }}</h1>
          <p>Indica cuántas personas sois y elige una mesa</p>
        </div>
      </div>

      <form class="people-form card" (ngSubmit)="search()">
        <label for="people">Número de personas</label>
        <input id="people" name="people" type="number" min="1" step="1" [(ngModel)]="people" />
        <button type="submit" class="btn btn-primary" [disabled]="loading()">Ver mesas libres</button>
      </form>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas libres para {{ searchedPeople() }} personas</p>
          </div>
        } @else {
          <div class="table-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selected()?.id === table.id"
                      (click)="select(table)">
                <h3>Mesa {{ table.number }}</h3>
                <p>{{ table.capacity }} plazas</p>
                @if (table.description) {
                  <p class="description">{{ table.description }}</p>
                }
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      color: var(--text-muted);
      font-size: 13px;
    }
    .people-form {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .people-form input {
      width: 90px;
    }
    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .table-card {
      padding: 16px;
      text-align: left;
      transition: all var(--transition);
    }
    .table-card:hover,
    .table-card.selected {
      border-color: var(--green-medium);
    }
    .table-card.selected {
      background: var(--green-glow);
    }
    .table-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .table-card p {
      color: var(--text-muted);
      font-size: 13px;
    }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly restaurantService = inject(RestaurantService)
  private readonly tableService = inject(TableService)

  readonly restaurant = signal<Restaurant | null>(null)
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly loading = signal(false)
  readonly searched = signal(false)
  readonly searchedPeople = signal(0)
  readonly error = signal<string | null>(null)

  people = 2
  protected restaurantId = ''

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => this.error.set('Error al cargar el restaurante')
    })
  }

  search(): void {
    const people = Number(this.people)
    if (!Number.isInteger(people) || people < 1) {
      this.error.set('El número de personas debe ser un entero mayor que 0')
      return
    }

    this.loading.set(true)
    this.error.set(null)
    this.selected.set(null)

    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPeople.set(people)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: (err) => {
        this.error.set(err.error?.message ?? err.error?.error ?? 'Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }

  select(table: Table): void {
    this.selected.set(table)
  }
}
