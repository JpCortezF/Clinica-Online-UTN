import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../../services/database.service';
import { Chart } from 'chart.js';
import { SpecialtyStats } from '../../../interfaces/SpecialtyStats';
import { AppointmentWithSpecialty } from '../../../types/AppointmentWithSpecialty';
import { CommonModule } from '@angular/common';

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
}
