import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';
import { ModalPromptComponent } from '../modal-prompt/modal-prompt.component';
import { ModalViewComponent } from '../modal-view/modal-view.component';

@Component({
  selector: 'app-appointment-overview',
  imports: [CommonModule, FormsModule, ModalViewComponent],
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css'
})
export class AppointmentOverviewComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  appointments: Appointment[] = [];
  searchTerm = '';
  filterStatus: 'pendiente' | 'realizado' | 'cancelados' | 'aceptado' | 'rechazado' = 'pendiente';

  showModal = false;
  modalTitle = '';
  modalDescription = '';
  modalAction: 'cancel' | 'survey' | null = null;
  modalAppointmentId: number | null = null;

  showReviewModal = false;
  currentReview: string = '';

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
    this.modalTitle = 'Cancelar Turno';
    this.modalDescription = 'Por favor ingrese el motivo de la cancelación:';
    this.modalAction = 'cancel';
    this.modalAppointmentId = appointmentId;
    this.showModal = true;
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

  viewReview(review: string) {
    this.currentReview = review;
    this.showReviewModal = true;
  }

  completeSurvey(appointmentId: number) {
    this.modalTitle = 'Completar Encuesta';
    this.modalDescription = 'Ingrese su comentario o experiencia sobre el turno:';
    this.modalAction = 'survey';
    this.modalAppointmentId = appointmentId;
    this.showModal = true;
  }

  handleModalConfirm(input: string) {
    if (this.modalAction === 'cancel' && this.modalAppointmentId) {
      this.db.updateAppointmentStatus(this.modalAppointmentId, 'cancelado', input).then(success => {
        if (success) this.reloadAppointments();
      });
    } else if (this.modalAction === 'survey' && this.modalAppointmentId) {
      this.db.submitSurvey(this.modalAppointmentId, input).then(success => {
        if (success) this.reloadAppointments();
      });
    }

    this.resetModal();
  }

  handleModalCancel() {
    this.resetModal();
  }

  private resetModal() {
    this.showModal = false;
    this.modalTitle = '';
    this.modalDescription = '';
    this.modalAction = null;
    this.modalAppointmentId = null;
  }
}
