import { Component, inject } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { DatabaseService } from '../../../services/database.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { LogEntry } from '../../../interfaces/LogEntry';

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

  downloadLogsExcel(logs: LogEntry[]) {
    if (!logs || logs.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    const worksheetData = logs.map(log => ({
      Usuario: log.name,
      Fecha: log.date
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logins');

    XLSX.writeFile(workbook, 'Clinica_Online_Logs.xlsx');
  }
}
