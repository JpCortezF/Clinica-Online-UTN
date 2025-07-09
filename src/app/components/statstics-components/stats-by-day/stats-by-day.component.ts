import { Component, inject } from '@angular/core';
import { Chart } from 'chart.js';
import { DatabaseService } from '../../../services/database.service';
import jsPDF from 'jspdf';

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

  async downloadDayStatsPDF() {
    const canvas = document.getElementById('dayChart') as HTMLCanvasElement;
    if (!canvas) return;

    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    const imgData = canvas.toDataURL('image/png');

    const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');

    doc.addImage(logo, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('Turnos por Día', 50, 20);
    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${fecha}`, 50, 28);

    // Agregar imagen del gráfico debajo
    doc.addImage(imgData, 'PNG', 15, 50, 180, 100);

    doc.save('Clinica_Online_Turnos_Por_Dia.pdf');
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
