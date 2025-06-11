import { CommonModule } from '@angular/common';
import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { DatabaseService } from '../../../services/database.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-specialist-overview',
  imports: [CommonModule, FormsModule],
  templateUrl: './specialist-overview.component.html',
  styleUrl: './specialist-overview.component.css'
})
export class SpecialistOverviewComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  appointments: Appointment[] = [];
  searchTerm = '';
  filterStatus: 'pendiente' | 'aceptado' | 'realizado' | 'cancelados' = 'pendiente';
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['user']?.currentValue) {
      const user = changes['user'].currentValue;
      this.loadAppointments(user.id);
    }
  } 

  private async loadAppointments(userId: number) {
    this.appointments = await this.db.getAppointmentsBySpecialist(userId);
  }

  filteredAppointments(): Appointment[] {
    const term = this.searchTerm.toLowerCase();

    return this.appointments.filter(appt => {
      const matchText =
        appt.patient_name?.toLowerCase().includes(term) ||
        appt.specialty_name?.toLowerCase().includes(term);

      const matchStatus =
        this.filterStatus === 'cancelados'
          ? ['cancelado', 'rechazado'].includes(appt.status)
          : appt.status === this.filterStatus;

      return matchText && matchStatus;
    });
  }

  async acceptAppointment(appointmentId: number) {
    const confirmed = confirm('¿Estás seguro de que querés aceptar este turno?');
    if (!confirmed) return;

    const success = await this.db.updateAppointmentStatus(appointmentId, 'aceptado');
    if (success) await this.reloadAppointments();
  }

  async rejectAppointment(appointmentId: number) {
    const reason = prompt('Motivo del rechazo del turno:');
    if (!reason?.trim()) return;

    const success = await this.db.updateAppointmentStatus(appointmentId, 'rechazado', reason.trim());
    if (success) await this.reloadAppointments();
  }

  async cancelAppointment(appointmentId: number) {
    const reason = prompt('Motivo de la cancelación del turno:');
    if (!reason?.trim()) return;

    const success = await this.db.updateAppointmentStatus(appointmentId, 'cancelado', reason.trim());
    if (success) await this.reloadAppointments();
  }

  async finalizeAppointment(appointmentId: number) {
    const review = prompt('Ingresá un comentario o diagnóstico del turno:');
    if (!review?.trim()) return;

    const success = await this.db.finalizeAppointment(appointmentId, review.trim());
    if (success) await this.reloadAppointments();
  }

  private async reloadAppointments() {
    if (this.user?.id) {
      this.appointments = await this.db.getAppointmentsBySpecialist(this.user.id);
    }
  }

  viewReview(review: string) {
    alert(`Comentario del turno:\n\n${review}`);
  }
}
