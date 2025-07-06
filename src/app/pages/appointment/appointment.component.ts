import { Component, inject } from '@angular/core';
import { UserService } from '../../services/user.service';
import { AppointmentRequestComponent } from "../../components/appointment-components/appointment-request/appointment-request.component";
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { FormsModule } from '@angular/forms';
import { AppointmentOverviewComponent } from '../../components/appointment-components/appointment-overview/appointment-overview.component';
import { SpecialistOverviewComponent } from "../../components/appointment-components/specialist-overview/specialist-overview.component";

@Component({
  selector: 'app-appointment',
  imports: [AppointmentRequestComponent, AppointmentOverviewComponent, CommonModule, FormsModule, SpecialistOverviewComponent],
  templateUrl: './appointment.component.html',
  styleUrl: './appointment.component.css'
})
export class AppointmentComponent {
  userSession = inject(UserService);
  db = inject(DatabaseService);
  appointments: any[] = [];
  user: any = null;
  searchTerm = '';
  viewMode: 'form' | 'list' = 'list';
  isLoading = true;
  isPatient = false;

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }
    
    this.user = this.userSession.getUser();
    if(this.user.user_type === 'patient'){
      this.isPatient = true;
    }
    this.loadAppointments();
    this.isLoading = false;
  }

  async loadAppointments(){
    this.appointments = await this.db.getAppointmentsByPatientId(this.user.id);
    console.log('TURNOS:', this.appointments);
  }

  async cancelAppointment(id: number) {
    const motivo = prompt('¿Por qué deseas cancelar el turno?');
    if (!motivo) return;

    await this.db.sb.supabase
      .from('appointments')
      .update({ status: 'cancelado', cancel_comment: motivo })
      .eq('id', id);

    this.loadAppointments();
  }

  async rateAppointment(id: number) {
    const comentario = prompt('¿Cómo fue la atención del especialista?');
    const rating = prompt('¿Qué calificación le das del 1 al 5?');
    const score = parseInt(rating || '0', 10);

    if (!comentario || isNaN(score) || score < 1 || score > 5) return;

    await this.db.sb.supabase
      .from('appointments')
      .update({ review: comentario, rating: score })
      .eq('id', id);

    this.loadAppointments();
  }
}
