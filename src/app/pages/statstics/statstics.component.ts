import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogActivityComponent } from "../../components/statstics-components/log-activity/log-activity.component";

@Component({
  selector: 'app-statstics',
  imports: [CommonModule, FormsModule, LogActivityComponent],
  templateUrl: './statstics.component.html',
  styleUrl: './statstics.component.css'
})
export class StatsticsComponent {

  selectedTab: string = 'log';
  tabs = [
    { id: 'log', label: 'Log de Ingresos' },
    { id: 'specialty', label: 'Turnos por Especialidad' },
    { id: 'day', label: 'Turnos por Día' },
    { id: 'requested', label: 'Turnos Solicitados por Médico' },
    { id: 'finalized', label: 'Turnos Finalizados por Médico' }
  ];

}
