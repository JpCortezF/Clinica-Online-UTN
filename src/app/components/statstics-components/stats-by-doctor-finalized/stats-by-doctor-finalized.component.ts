import { Component, inject } from '@angular/core';
import { Chart } from 'chart.js';
import { DatabaseService } from '../../../services/database.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-stats-by-doctor-finalized',
  imports: [CommonModule, FormsModule],
  templateUrl: './stats-by-doctor-finalized.component.html',
  styleUrl: './stats-by-doctor-finalized.component.css'
})
export class StatsByDoctorFinalizedComponent {
  db = inject(DatabaseService)
selectedRange: string = '7';
  chart: Chart | null = null;

  async ngAfterViewInit() {
    await this.renderChart();
  }

  async onRangeChange(range: string) {
    this.selectedRange = range;
    await this.renderChart();
  }

  async renderChart() {
    const rangeMap: Record<string, number | null> = {
      '7': 7,
      '14': 14,
      '30': 30,
      'all': null
    };

    const rawData = await this.db.getRequestedAppointmentsByDoctor(
      rangeMap[this.selectedRange],
      'realizado' // 👈 Esto es lo único diferente respecto al componente anterior
    );

    const counts: Record<string, number> = {};
    rawData.forEach(entry => {
      counts[entry.name] = (counts[entry.name] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    const backgroundColors = labels.map(() => this.getRandomColor());

    const ctx = document.getElementById('doctorFinalizedChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Turnos finalizados',
          data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Cantidad de turnos finalizados por médico'
          },
          legend: { display: false }
        }
      }
    });
  }

  getRandomColor(): string {
    const r = Math.floor(Math.random() * 156 + 100);
    const g = Math.floor(Math.random() * 156 + 100);
    const b = Math.floor(Math.random() * 156 + 100);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  }
}
