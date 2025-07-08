import { Component, inject } from '@angular/core';
import { UserService } from '../../services/user.service';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Specialist } from '../../classes/user';
import { RawSpecialist } from '../../interfaces/RawSpecialist';

@Component({
  selector: 'app-patients-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-profile.component.html',
  styleUrl: './patients-profile.component.css'
})
export class PatientProfileComponent {
  db = inject(DatabaseService);
  userSession = inject(UserService);
  auth = inject(AuthService);

  user: any = null;
  patient: any = null;
  isLoading = true;

  specialists: any[] = [];
  selectedSpecialistId: number | null = null;

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.user = this.userSession.getUser();

    if (this.user?.user_type === 'patient') {
      this.patient  = await this.db.getPatientProfileData(this.user.id);
      this.specialists = await this.db.getRawSpecialistsWithAppointments(this.patient.id);
    }

    this.isLoading = false;
  }

  async downloadPdfHistory() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');

    try {
      const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');

      doc.addImage(logo, 'PNG', 10, 10, 30, 30);
      doc.setFontSize(18);
      doc.text('Informe de Historia Clínica', 50, 20);
      doc.setFontSize(12);
      doc.text(`Fecha de emisión: ${fecha}`, 50, 28);
      doc.text(`Paciente: ${this.patient.first_name} ${this.patient.last_name}`, 50, 36);

      const appointments = await this.db.getFullAppointments(this.patient.id);
      
      const sorted = [...appointments].sort(
        (a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      );

      const lastWithVitals = sorted.find(a => a.vital_signs !== null && a.vital_signs !== undefined);

      console.log('Last appointment with vitals:', lastWithVitals);
      if (lastWithVitals?.vital_signs) {
        const vs = lastWithVitals.vital_signs;

        doc.setFontSize(10);
        doc.text(`Altura: ${vs.height ?? '-'} cm`, 150, 20);
        doc.text(`Peso: ${vs.weight ?? '-'} kg`, 150, 26);
        doc.text(`Presión: ${vs.pressure ?? '-'}`, 150, 32);
        doc.text(`Temperatura: ${vs.temperature ?? '-'} °C`, 150, 38);
      }
      
      if (!appointments.length) {
        doc.text('No se registran turnos realizados.', 14, 50);
      } else {
        const rows = appointments.map((a: any) => {
          const fecha = new Date(a.appointment_date).toLocaleDateString('es-AR');
          const especialidad = a.specialty_name ?? 'Sin especialidad';

          let reseña = 'Aún no disponible';
          if (typeof a.review === 'string') {
            try {
              const parsed = JSON.parse(a.review);
              reseña = parsed.comment ?? reseña;
            } catch {
              reseña = a.review;
            }
          }

          const calificacion = a.rating ?? '-';
          let observaciones = '-';
          if (Array.isArray(a.extra_info) && a.extra_info.length > 0) {
            observaciones = a.extra_info.map((e: any) => `${e.key}: ${e.value}`).join(' | ');
          }

          return [fecha, especialidad, reseña, calificacion, observaciones];
        });

      autoTable(doc, {
        head: [['Fecha', 'Especialidad', 'Reseña', 'Calificación', 'Observaciones']],
        body: rows,
        startY: 50
      });
      }

      doc.save(`Historia_Clinica_${this.patient.first_name}_${this.patient.last_name}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    }
  }

  async downloadPdfByProfessional(specialist: RawSpecialist) {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    const allAppointments = await this.db.getFullAppointments(this.patient.id);

    // Filtrar por especialista
    const filtered = allAppointments.filter(a => a.specialist_id === specialist.id);

    if (!filtered.length) return;

    const fullName = `${specialist.user.first_name} ${specialist.user.last_name}`;

    try {
      const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');
      doc.addImage(logo, 'PNG', 10, 10, 30, 30);
      doc.setFontSize(18);
      doc.text('Historia Clínica por Profesional', 50, 20);
      doc.setFontSize(12);
      doc.text(`Fecha de emisión: ${fecha}`, 50, 28);
      doc.text(`Paciente: ${this.patient.first_name} ${this.patient.last_name}`, 50, 36);
      doc.text(`Profesional: ${fullName}`, 50, 44);

      const rows = filtered.map((a: any) => {
        const fecha = new Date(a.appointment_date).toLocaleDateString('es-AR');
        const especialidad = a.specialty_name ?? 'Sin especialidad';

        let reseña = 'Aún no disponible';
        if (typeof a.review === 'string') {
          try {
            const parsed = JSON.parse(a.review);
            reseña = parsed.comment ?? reseña;
          } catch {
            reseña = a.review;
          }
        }

        const calificacion = a.rating ?? '-';
        let observaciones = '-';
        if (Array.isArray(a.extra_info) && a.extra_info.length > 0) {
          observaciones = a.extra_info.map((e: any) => `${e.key}: ${e.value}`).join(' | ');
        }

        return [fecha, especialidad, reseña, calificacion, observaciones];
      });

      autoTable(doc, {
        head: [['Fecha', 'Especialidad', 'Reseña', 'Calificación', 'Observaciones']],
        body: rows,
        startY: 60
      });

      doc.save(`Historia_Clinica_${fullName.replace(/\s/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    }
  }

  getBase64ImageFromURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject('No context');
        }
      };
      img.onerror = error => reject(error);
    });
  }
}
