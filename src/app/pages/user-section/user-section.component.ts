import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-section',
  imports: [CommonModule],
  templateUrl: './user-section.component.html',
  styleUrl: './user-section.component.css'
})
export class UserSectionComponent {
  db = inject(DatabaseService);
  specialists: any[] = [];
  patients: any[] = [];
  isLoading = true;

  async ngOnInit() {
    try {
      this.specialists = await this.db.getSpecialists();
      this.patients = await this.db.getPatients();
    } catch (error) {
      console.error('Error al cargar especialistas', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateStatus(specialistId: number, status: 'pendiente' | 'habilitado' | 'rechazado') {
    try {
      await this.db.updateSpecialistStatus(specialistId, status);
      const updated = this.specialists.find(s => s.id === specialistId);
      if (updated) updated.status = status;
    } catch (error) {
      console.error('Error actualizando estado', error);
    }
  }
}
