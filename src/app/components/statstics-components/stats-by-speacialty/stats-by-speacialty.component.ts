import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../../services/database.service';
import { Chart } from 'chart.js';
import { SpecialtyStats } from '../../../interfaces/SpecialtyStats';
import { AppointmentWithSpecialty } from '../../../types/AppointmentWithSpecialty';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-stats-by-speacialty',
  imports: [CommonModule],
  templateUrl: './stats-by-speacialty.component.html',
  styleUrl: './stats-by-speacialty.component.css'
})
export class StatsBySpeacialtyComponent {
  db = inject(DatabaseService);
  specialtyStats: SpecialtyStats[] = [];

  async ngAfterViewInit() {
    const rawData: AppointmentWithSpecialty[] = await this.db.getAppointmentsBySpecialty();
    const statsMap: Map<string, SpecialtyStats> = new Map();

    rawData.forEach(entry => {
      const specialty = entry.specialties;
      const name = specialty?.name || 'Desconocido';
      const img = specialty?.img_specialty || '';

      if (!statsMap.has(name)) {
        statsMap.set(name, { name, img, count: 1 });
      } else {
        statsMap.get(name)!.count++;
      }
    });

    const stats = Array.from(statsMap.values());

    const labels = stats.map(s => s.name);
    const data = stats.map(s => s.count);
    const backgroundColors = labels.map(() => this.randomColor());

    const ctx = document.getElementById('specialtyChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Turnos por especialidad',
          data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Cantidad de turnos por especialidad'
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    });
    this.specialtyStats = stats;
  }

  private randomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.6)`;
  }

  async downloadSpecialtyPDF() {
    const canvas = document.getElementById('specialtyChart') as HTMLCanvasElement;
    if (!canvas) return;

    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    const imgData = canvas.toDataURL('image/png');
    const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');

    doc.addImage(logo, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('Turnos por Especialidad', 50, 20);
    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${fecha}`, 50, 28);

    doc.addImage(imgData, 'PNG', 15, 50, 180, 100);
    doc.save('Clinica_Online_Turnos_Por_Especialidad.pdf');
  }

  private getBase64ImageFromURL(url: string): Promise<string> {
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
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No context');
        }
      };
      img.onerror = error => reject(error);
    });
  }
}
