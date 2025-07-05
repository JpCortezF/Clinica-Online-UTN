import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { TreatedPatient } from '../../interfaces/TreatedPatient';
import { CompletedAppointment } from '../../interfaces/CompletedAppointment';
import { ModalViewComponent } from "../../components/appointment-components/modal-view/modal-view.component";

@Component({
  selector: 'app-patients-section',
  imports: [CommonModule, ModalViewComponent],
  templateUrl: './patients-section.component.html',
  styleUrl: './patients-section.component.css'
})
export class PatientsSectionComponent {
  db = inject(DatabaseService);
  userSession = inject(UserService);
  user: any = null;
  specialties: string[] = [];
  isLoading = true;
  patients: TreatedPatient[] = [];

  selectedPatient: TreatedPatient | null = null;
  patientAppointments: CompletedAppointment[] = [];
  showPatientModal = false;

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.user = this.userSession.getUser();
    if (this.user) {
      const specialist = await this.db.getSpecialistByUserId(this.user.id);
      if (specialist) {
        this.patients = await this.db.getPatientsTreatedBySpecialist(specialist.id);
      }
    }

    this.isLoading = false;
  }

  async selectPatient(patient: TreatedPatient) {
    this.selectedPatient = patient;
    this.showPatientModal = true;
    const specialist = await this.db.getSpecialistByUserId(this.user.id);
    if(specialist)
    this.patientAppointments = await this.db.getCompletedAppointments(patient.id, specialist.id);
  }
}
