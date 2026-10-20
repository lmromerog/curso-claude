import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  readonly canChangeStatus = computed(() => {
    const role = this.authStore.userRole();
    return role === 'admin' || role === 'manager' || role === 'camarero';
  });

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId ?? undefined;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  changeStatus(table: Table, status: TableStatus): void {
    const restaurantId = this.restaurantId;
    if (restaurantId && status !== table.status) {
      this.tableStore.updateStatus(restaurantId, table.id, status);
    }
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`;
  }
}
