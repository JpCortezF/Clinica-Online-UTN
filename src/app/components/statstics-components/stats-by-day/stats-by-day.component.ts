import { Component, inject } from '@angular/core';
import { Chart } from 'chart.js';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-stats-by-day',
  imports: [],
  templateUrl: './stats-by-day.component.html',
  styleUrl: './stats-by-day.component.css'
})
export class StatsByDayComponent {
  db = inject(DatabaseService);
  
  async ngAfterViewInit() {
    const rawData = await this.db.getAppointmentsGroupedByDay();  
    const counts: Record<string, number> = {};
    
    rawData.forEach(entry => {
      const date = entry.appointment_date.split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
    });
    
    const labels = Object.keys(counts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const data = labels.map(label => counts[label]);
    
    const ctx = document.getElementById('dayChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Turnos por día',
          data,
          fill: true,
          tension: 0.4,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          pointBackgroundColor: 'rgba(59, 130, 246, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Cantidad de turnos por día'
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}
