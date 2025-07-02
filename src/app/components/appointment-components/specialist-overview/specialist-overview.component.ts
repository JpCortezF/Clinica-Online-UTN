import { CommonModule } from '@angular/common';
import { Component, inject, Input, SimpleChanges } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { DatabaseService } from '../../../services/database.service';
import { FormsModule } from '@angular/forms';
import { ModalViewComponent } from "../modal-view/modal-view.component";

@Component({
  selector: 'app-specialist-overview',
  imports: [CommonModule, FormsModule, ModalViewComponent],
  templateUrl: './specialist-overview.component.html',
  styleUrl: './specialist-overview.component.css'
})
export class SpecialistOverviewComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  appointments: Appointment[] = [];
  searchTerm = '';
  filterStatus: 'pendiente' | 'aceptado' | 'realizado' | 'cancelados' = 'pendiente';
  
  modalConfig = {
    isVisible: false,
    title: '',
    description: '',
    content: '',
    showInput: false,
    inputLabel: '',
    showConfirmButton: false,
    confirmButtonText: 'Confirmar',
    action: null as 'accept' | 'reject' | 'cancel' | 'finalize' | 'review' | null,
    appointmentId: null as number | null
  };
  
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

  openAcceptModal(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Confirmar aceptación',
      description: '¿Estás seguro de que querés aceptar este turno?',
      content: '',
      showInput: false,
      inputLabel: '',
      showConfirmButton: true,
      confirmButtonText: 'Aceptar',
      action: 'accept',
      appointmentId: appointmentId
    };
  }

  openRejectModal(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Rechazar turno',
      description: 'Por favor, indica el motivo del rechazo:',
      content: '',
      showInput: true,
      inputLabel: 'Motivo',
      showConfirmButton: true,
      confirmButtonText: 'Rechazar',
      action: 'reject',
      appointmentId: appointmentId
    };
  }

  openCancelModal(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Cancelar turno',
      description: 'Por favor, indica el motivo de la cancelación:',
      content: '',
      showInput: true,
      inputLabel: 'Motivo',
      showConfirmButton: true,
      confirmButtonText: 'Cancelar',
      action: 'cancel',
      appointmentId: appointmentId
    };
  }

  openFinalizeModal(appointmentId: number) {
    this.modalConfig = {
      isVisible: true,
      title: 'Finalizar turno',
      description: 'Ingresá un comentario o diagnóstico del turno:',
      content: '',
      showInput: true,
      inputLabel: 'Comentario',
      showConfirmButton: true,
      confirmButtonText: 'Finalizar',
      action: 'finalize',
      appointmentId: appointmentId
    };
  }

  viewReview(review: string) {
    this.modalConfig = {
      isVisible: true,
      title: 'Reseña del especialista',
      description: '',
      content: review,
      showInput: false,
      inputLabel: '',
      showConfirmButton: false,
      confirmButtonText: '',
      action: 'review',
      appointmentId: null
    };
  }

  private async reloadAppointments(): Promise<void> {
    if (this.user?.id) {
      this.appointments = await this.db.getAppointmentsBySpecialist(this.user.id);
    }
  }

  handleModalConfirm(inputValue: string = '') {
    if (!this.modalConfig.appointmentId && this.modalConfig.action !== 'review') {
      this.closeModal();
      return;
    }

    const handleSuccess = (success: boolean) => {
      if (success) {
        this.reloadAppointments();
      }
      this.closeModal();
    };

    switch (this.modalConfig.action) {
      case 'accept':
        this.db.updateAppointmentStatus(this.modalConfig.appointmentId!, 'aceptado')
          .then(handleSuccess);
        break;
        
      case 'reject':
        this.db.updateAppointmentStatus(this.modalConfig.appointmentId!, 'rechazado', inputValue)
          .then(handleSuccess);
        break;
        
      case 'cancel':
        this.db.updateAppointmentStatus(this.modalConfig.appointmentId!, 'cancelado', inputValue)
          .then(handleSuccess);
        break;
        
      case 'finalize':
        this.db.finalizeAppointment(this.modalConfig.appointmentId!, inputValue)
          .then(handleSuccess);
        break;
    }
  }

  closeModal() {
    this.modalConfig.isVisible = false;
  }
}
