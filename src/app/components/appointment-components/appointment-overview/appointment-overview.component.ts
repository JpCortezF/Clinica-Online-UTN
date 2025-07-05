import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';
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

  showReviewModal = false;
  currentReview: string = '';

  modalConfig = {
    isVisible: false,
    title: '',
    description: '',
    specialistName: '',
    content: '',
    showInput: false,
    inputLabel: '',
    showRating: false,
    currentRating: 0,
    showConfirmButton: false,
    confirmButtonText: 'Confirmar',
    action: null as 'cancel' | 'survey' | 'rate' | null,
    appointmentId: null as number | null
  };
  
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
    this.modalConfig = {
      isVisible: true,
      title: 'Cancelar Turno',
      description: 'Por favor ingrese el motivo de la cancelación con la especialista:',
      specialistName: this.appointments.find(appt => appt.id === appointmentId)?.specialist_name || '',
      content: '',
      showInput: true,
      inputLabel: 'Motivo',
      showRating: false,
      currentRating: 0,
      showConfirmButton: true,
      confirmButtonText: 'Confirmar cancelación',
      action: 'cancel',
      appointmentId: appointmentId
    };
  }

  private async reloadAppointments(): Promise<void> {
    if (this.user?.id) {
      this.appointments = await this.db.getAppointmentsByPatient(this.user.id);
    }
  }

  async deleteAppointment(appointmentId: number) {
    const success = await this.db.deleteAppointment(appointmentId);
    if (success) await this.reloadAppointments();
  }

  rateAppointment(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Calificar atención médica',
      description: '¿Cómo calificarías la atención recibida?',
      specialistName: this.appointments.find(appt => appt.id === appointmentId)?.specialist_name || '',
      content: '',
      showInput: true,
      inputLabel: 'Comentario (opcional)',
      showRating: true,
      currentRating: 0,
      showConfirmButton: true,
      confirmButtonText: 'Enviar calificación',
      action: 'rate',
      appointmentId: appointmentId
    };
  }

  viewReview(review: string) {
    this.currentReview = review;
    this.showReviewModal = true;
  }

  completeSurvey(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Encuesta de satisfacción',
      description: 'Por favor califica tu experiencia con el especialista:',
      specialistName: this.appointments.find(appt => appt.id === appointmentId)?.specialist_name || '',
      content: '',
      showInput: true,
      inputLabel: 'Comentarios adicionales',
      showRating: true,
      currentRating: 0,
      showConfirmButton: true,
      confirmButtonText: 'Enviar encuesta',
      action: 'survey',
      appointmentId: appointmentId
    };
  }

  handleModalConfirm(input: string = '') {
    const handleSuccess = async (success: boolean) => {
      if (success) {
        await this.reloadAppointments();
      }
      this.closeModal();
    };

    switch (this.modalConfig.action) {
      case 'cancel':
        this.db.updateAppointmentStatus(this.modalConfig.appointmentId!, 'cancelado', input
        ).then(handleSuccess);
        break;
        
      case 'survey':
        this.db.submitSurvey(
          this.modalConfig.appointmentId!, input, this.modalConfig.currentRating
        ).then(handleSuccess);
        break;
        
      case 'rate':
        this.db.rateAppointment(
          this.modalConfig.appointmentId!, input, this.modalConfig.currentRating
        ).then(handleSuccess);
        break;
    }
  }

  closeModal() {
    this.modalConfig = {
      isVisible: false,
      title: '',
      description: '',
      specialistName: '',
      content: '',
      showInput: false,
      inputLabel: '',
      showRating: false,
      currentRating: 0,
      showConfirmButton: false,
      confirmButtonText: 'Confirmar',
      action: null,
      appointmentId: null
    };
  }

  setRating(rating: number) {
    this.modalConfig.currentRating = rating;
  }
}
