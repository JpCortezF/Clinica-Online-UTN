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
  viewMode: 'form' | 'list' = 'list';
  isPatient = false;
  submittedWithSuccess = false;

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }
    
    this.user = this.userSession.getUser();
    if(this.user.user_type === 'patient'){
      this.isPatient = true;
    }
    this.loadAppointments();
  }

  async loadAppointments(){
    this.appointments = await this.db.getAppointmentsByPatientId(this.user.id);
  }

  onAppointmentSubmitted() {
    this.submittedWithSuccess = true;
    this.viewMode = 'list';

    setTimeout(() => {
      this.submittedWithSuccess = false;
    }, 500);
  }
}
