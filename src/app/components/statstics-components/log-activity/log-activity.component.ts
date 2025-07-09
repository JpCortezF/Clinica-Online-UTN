import { Component, inject } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { DatabaseService } from '../../../services/database.service';
import { LogEntry } from '../../../interfaces/LogEntry';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-log-activity',
  imports: [],
  templateUrl: './log-activity.component.html',
  styleUrl: './log-activity.component.css'
})
export class LogActivityComponent {
  db = inject(DatabaseService)
  logs: LogEntry[] = [];
  
  async ngAfterViewInit() {
    const logs = await this.db.getLoginStats();
    this.logs = logs; // 👈 Guardamos para luego exportar

    const grouped: { [user: string]: { [date: string]: number } } = {};
    logs.forEach(log => {
      if (!grouped[log.name]) grouped[log.name] = {};
      if (!grouped[log.name][log.date]) grouped[log.name][log.date] = 0;
      grouped[log.name][log.date]++;
    });

    const allDates = Array.from(new Set(logs.map(log => log.date))).sort();

    const colorPalette = [
      '#60A5FA', '#F87171', '#34D399', '#FBBF24', '#A78BFA',
      '#F472B6', '#38BDF8', '#FDBA74', '#6EE7B7', '#93C5FD',
    ];

    const datasets = Object.entries(grouped).map(([name, logDates], index) => {
      const data = allDates.map(date => logDates[date] || 0);
      return {
        label: name,
        data,
        backgroundColor: colorPalette[index % colorPalette.length]
      };
    });

    const ctx = document.getElementById('logChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: allDates,
        datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Ingresos al sistema por usuario y día'
          }
        }
      }
    });
  }

  async downloadLogsPDF() {
    const canvas = document.getElementById('logChart') as HTMLCanvasElement;
    if (!canvas) return;

    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-AR');
    const logo = await this.getBase64ImageFromURL('/JB_Clinica.png');
    const chartImg = canvas.toDataURL('image/png');

    doc.addImage(logo, 'PNG', 10, 10, 30, 30);
    doc.setFontSize(18);
    doc.text('Reporte de Logins al Sistema', 50, 20);
    doc.setFontSize(12);
    doc.text(`Fecha de emisión: ${fecha}`, 50, 28);

    doc.addImage(chartImg, 'PNG', 15, 50, 180, 100);
    doc.save('Clinica_Online_Logs.pdf');
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
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject('No se pudo obtener el contexto del canvas');
        }
      };
      img.onerror = err => reject(err);
    });
  }
}
