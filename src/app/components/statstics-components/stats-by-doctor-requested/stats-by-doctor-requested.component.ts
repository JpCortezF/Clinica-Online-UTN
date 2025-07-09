import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../../services/database.service';
import { Chart } from 'chart.js';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-stats-by-doctor-requested',
  imports: [CommonModule],
  templateUrl: './stats-by-doctor-requested.component.html',
  styleUrl: './stats-by-doctor-requested.component.css'
})
export class StatsByDoctorRequestedComponent {
  db = inject(DatabaseService);
  selectedRange: string = '7';
  chartInstance: Chart | null = null;

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

    const rawData = await this.db.getRequestedAppointmentsByDoctor(rangeMap[this.selectedRange], null);

    const counts: Record<string, number> = {};
    rawData.forEach(entry => {
      counts[entry.name] = (counts[entry.name] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);
    
    const backgroundColors = labels.map(() => this.getRandomColor());

    const ctx = document.getElementById('doctorRequestedChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Turnos solicitados',
          data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Cantidad de turnos solicitados por médico'
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

  async downloadRequestedPDF() {
    const canvas = document.getElementById('doctorRequestedChart') as HTMLCanvasElement;
    if (!canvas) return;

    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    const imgData = canvas.toDataURL('image/png');
    const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');

    doc.addImage(logo, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('Turnos Solicitados por Médico', 50, 20);
    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${fecha}`, 50, 28);
    doc.text(`Rango seleccionado: ${this.selectedRange === 'all' ? 'Todos' : 'Últimos ' + this.selectedRange + ' días'}`, 50, 36);

    doc.addImage(imgData, 'PNG', 15, 50, 180, 100);
    doc.save('Clinica_Online_Turnos_Solicitados.pdf');
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
