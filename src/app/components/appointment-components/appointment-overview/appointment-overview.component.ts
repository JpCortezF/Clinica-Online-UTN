import { Component, Input } from '@angular/core';
import { Appointment } from '../../../interfaces/appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-appointment-overview',
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-overview.component.html',
  styleUrl: './appointment-overview.component.css'
})
export class AppointmentOverviewComponent {
  @Input() appointments: Appointment[] = [];
  searchTerm = '';

  filteredAppointments() {
    const term = this.searchTerm.toLowerCase();
    return this.appointments.filter(appt =>
      appt.specialist_name.toLowerCase().includes(term) ||
      appt.specialty_name.toLowerCase().includes(term)
    );
  }

  cancelAppointment(id: number) {
    // lógica para cancelar (puede emitir un evento si querés notificar al padre)
    console.log('Cancelar turno:', id);
  }

  rateAppointment(id: number) {
    // lógica para calificar
    console.log('Calificar atención:', id);
  }

  completeSurvey(id: number) {
    // lógica para encuesta
    console.log('Completar encuesta:', id);
  }

  viewReview(review: string) {
    // lógica para mostrar review (puede abrir modal)
    console.log('Ver reseña:', review);
  }
}
