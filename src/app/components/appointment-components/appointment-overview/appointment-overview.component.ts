import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';
import { ModalViewComponent } from '../modal-view/modal-view.component';
import { CancelMessagePipe } from "../../../pipes/cancel-message.pipe";
import { SearchInputComponent } from "../search-input/search-input.component";

@Component({
  selector: 'app-appointment-overview',
  imports: [CommonModule, FormsModule, ModalViewComponent, CancelMessagePipe, SearchInputComponent],
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css'
})
export class AppointmentOverviewComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  appointments: Appointment[] = [];
  searchTerm = '';
  filterStatus: 'pendiente' | 'realizado' | 'cancelados' | 'aceptado' | 'rechazado' = 'pendiente';

  selectedAppointmentForVitals: Appointment | null = null;
  showVitalsModal = false;

  selectedAppointmentForExtraInfo: Appointment | null = null;
  showExtraModal = false;

  showReviewModal = false;
  currentReview: {
    review: string;
    appointment_date: string;
    vital_signs?: {
      height: number;
      weight: number;
      temperature: number;
      pressure: string;
    } | null;
    extra_info?: { key: string; value: string }[] | null;
  } | null = null;

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
      // Campos visibles o relevantes
      const requestDate = appt.request_date?.toLowerCase() || '';
      const appointmentDate = appt.appointment_date?.toLowerCase() || '';
      const requestMessage = appt.request_message?.toLowerCase() || '';
      const specialistName = appt.specialist_name?.toLowerCase() || '';
      const specialtyName = appt.specialty_name?.toLowerCase() || '';
      const status = appt.status?.toLowerCase() || '';

      const reviewText = typeof appt.specialist_review === 'string'
        ? appt.specialist_review.toLowerCase()
        : '';

      const vitalsText = appt.vital_signs
        ? `altura: ${appt.vital_signs.height} peso: ${appt.vital_signs.weight} presión: ${appt.vital_signs.pressure} temperatura: ${appt.vital_signs.temperature}`.toLowerCase()
        : '';

      const extraInfoText = appt.extra_info
        ? appt.extra_info.map(i => `${i.key}: ${i.value}`).join(' ').toLowerCase()
        : '';

      const matchesSearch =
        requestDate.includes(term) ||
        appointmentDate.includes(term) ||
        requestMessage.includes(term) ||
        specialistName.includes(term) ||
        specialtyName.includes(term) ||
        vitalsText.includes(term) ||
        extraInfoText.includes(term) ||
        reviewText.includes(term) ||
        status.includes(term);

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

  viewReview(appt: Appointment) {
    this.currentReview = {
      review: appt.specialist_review ?? 'Sin reseña registrada.',
      appointment_date: appt.appointment_date,
      vital_signs: appt.vital_signs ?? null,
      extra_info: appt.extra_info ?? null
    };
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

  openVitalModal(appt: Appointment) {
    this.selectedAppointmentForVitals = appt;
    this.showVitalsModal = true;
  }

  openExtraInfoModal(appt: Appointment) {
    this.selectedAppointmentForExtraInfo = appt;
    this.showExtraModal = true;
  }

  formatVitals(vs: any): string {
    if (!vs) return 'Sin datos';
    return `Altura: ${vs.height} cm\nPeso: ${vs.weight} kg\nTemperatura: ${vs.temperature} °C\nPresión: ${vs.pressure}`;
  }

  formatExtraInfo(info: { key: string; value: string }[] | null | undefined = []): string {
    if (!info || !info.length) return 'Sin información adicional.';
    return info.map(i => `${i.key}: ${i.value}`).join('\n');
  }
}
