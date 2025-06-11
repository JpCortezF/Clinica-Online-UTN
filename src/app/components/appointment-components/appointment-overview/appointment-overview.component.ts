import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-appointment-overview',
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css'
})
export class AppointmentOverviewComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  appointments: Appointment[] = [];
  searchTerm = '';
  filterStatus: 'pendiente' | 'realizado' | 'cancelados' | 'aceptado' = 'pendiente';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user']?.currentValue) {
      const user = changes['user'].currentValue;
      this.loadAppointments(user.id);
    }
  }

  private async loadAppointments(userId: number) {
    this.appointments = await this.db.getAppointmentsByPatient(userId);
  }

  filteredAppointments(): Appointment[] {
    const term = this.searchTerm.toLowerCase();

    return this.appointments.filter(appt => {
      const matchesSearch =
        appt.specialist_name.toLowerCase().includes(term) ||
        appt.specialty_name.toLowerCase().includes(term);

      const matchesStatus =
      this.filterStatus === 'cancelados'
        ? appt.status === 'cancelado' || appt.status === 'rechazado'
        : this.filterStatus === 'pendiente'
          ? appt.status === 'pendiente' || appt.status === 'aceptado'
          : appt.status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });
  }

  async cancelAppointment(appointmentId: number) {
    const reason = prompt('Motivo de la cancelación del turno:');
    if (!reason?.trim()) return;

    const success = await this.db.updateAppointmentStatus(appointmentId, 'cancelado', reason.trim());
    if (success) await this.reloadAppointments();
  }

  private async reloadAppointments() {
    if (this.user?.id) {
      this.appointments = await this.db.getAppointmentsBySpecialist(this.user.id);
    }
  }

  async deleteAppointment(appointmentId: number) {
    const success = await this.db.deleteAppointment(appointmentId);
    if (success) await this.reloadAppointments();
  }

  rateAppointment(appointmentId: number) {
    // lógica para calificar
    console.log('Calificar atención:', appointmentId);
  }

  completeSurvey(appointmentId: number) {
    // lógica para encuesta
    console.log('Completar encuesta:', appointmentId);
  }

  viewReview(review: string) {
    // lógica para mostrar review (puede abrir modal)
    console.log('Ver reseña:', review);
  }
}
