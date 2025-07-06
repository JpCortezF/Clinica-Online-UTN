import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CardProfileComponent } from "../../components/profile-components/card-profile/card-profile.component";
import { ModalViewComponent } from "../../components/appointment-components/modal-view/modal-view.component";
import { TreatedPatient } from '../../interfaces/TreatedPatient';

@Component({
  selector: 'app-user-section',
  imports: [CommonModule, CardProfileComponent, ModalViewComponent],
  templateUrl: './user-section.component.html',
  styleUrl: './user-section.component.css'
})
export class UserSectionComponent {
  db = inject(DatabaseService);
  specialists: any[] = [];
  patients: any[] = [];
  admins: any[] = [];
  selectedTab: 'todos' | 'especialistas' | 'pacientes' | 'admin' = 'especialistas';
  isLoading = true;

  showDownloadModal = false;
  showNoAppointmentsModal = false;

  selectedPatientForDownload: any = null;
  selectedPatientForModal: TreatedPatient | null = null;

  async ngOnInit() {
    try {
      this.specialists = await this.db.getSpecialists();
      this.patients = await this.db.getPatients();
      this.admins = await this.db.getAdmins();
    } catch (error) {
      console.error('Error al cargar especialistas', error);
    } finally {
      this.isLoading = false;
    }
  }

  async updateStatus(specialistId: number, status: 'pendiente' | 'habilitado' | 'rechazado') {
    try {
      await this.db.updateSpecialistStatus(specialistId, status);
      const updated = this.specialists.find(s => s.id === specialistId);
      if (updated) updated.status = status;
    } catch (error) {
      console.error('Error actualizando estado', error);
    }
  }

   get allUsers() {
    return [
      ...this.specialists.map(s => ({ ...s.user, tipo: 'especialista', especialidades: s.specialist_specialties, status: s.status, idEspecialista: s.id })),
      ...this.patients.map(p => ({ ...p.user, tipo: 'paciente', health_medical: p.health_medical })),
      ...this.admins.map(a => ({ ...a, tipo: 'admin' }))
    ];
  }

  async downloadAllUsersExcel() {
    const allUsers = [...this.specialists, ...this.patients, ...this.admins];

    const data = allUsers.map(u => {
      const user = u.user || u;
      return {
        Nombre: `${user.first_name} ${user.last_name}`,
        DNI: user.dni,
        Edad: user.age,
        Email: user.email,
        Rol: this.getUserRole(user.user_type),
        Especialidad: u.specialist_specialties?.map((s: any) => s.specialty.name).join(', ') || '',
        Estado: u.status || '',
        'Obra Social': u.health_medical || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'Usuarios_JB_Clinica.xlsx');
  }

  async confirmDownloadHistory(patient: any) {
    this.selectedPatientForDownload = patient;
    this.selectedPatientForModal = {
        first_name: patient.user.first_name,
        last_name: patient.user.last_name,
        profile_image_url: patient.user.profile_image_url   
    } as TreatedPatient;

    this.showDownloadModal = true;
  }

  async downloadPatientHistory() {
    const patient = this.selectedPatientForDownload;
    this.showDownloadModal = false;

    try {
      const appointments = await this.db.getFullAppointments(patient.id);

      if (!appointments.length) {
        this.showNoAppointmentsModal = true;
        return;
      }

      const data = appointments.map(appt => ({
        Fecha: new Date(appt.appointment_date).toLocaleString(),
        Especialista: appt.specialist_name,
        Especialidad: appt.specialty_name,
        Estado: appt.status,
        Reseña: appt.review ?? '',
        Calificación: appt.rating ?? ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historia Clínica');

      const nombre = `${patient.user.first_name}_${patient.user.last_name}_historia_clinica.xlsx`;
      XLSX.writeFile(workbook, nombre);
    } catch (err) {
      console.error('Error al generar el Excel:', err);
    }
  }

  getUserRole(role: string): string {
    switch (role) {
      case 'specialist': return 'Especialista';
      case 'patient': return 'Paciente';
      case 'admin': return 'Administrador';
      default: return role;
    }
  }
}
