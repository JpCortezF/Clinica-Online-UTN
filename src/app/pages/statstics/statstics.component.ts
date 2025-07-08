import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LogActivityComponent } from "../../components/statstics-components/log-activity/log-activity.component";
import { StatsBySpeacialtyComponent } from "../../components/statstics-components/stats-by-speacialty/stats-by-speacialty.component";
import { StatsByDayComponent } from "../../components/statstics-components/stats-by-day/stats-by-day.component";
import { StatsByDoctorRequestedComponent } from "../../components/statstics-components/stats-by-doctor-requested/stats-by-doctor-requested.component";
import { StatsByDoctorFinalizedComponent } from "../../components/statstics-components/stats-by-doctor-finalized/stats-by-doctor-finalized.component";

@Component({
  selector: 'app-statstics',
  imports: [CommonModule, FormsModule, LogActivityComponent, StatsBySpeacialtyComponent, StatsByDayComponent, StatsByDoctorRequestedComponent, StatsByDoctorFinalizedComponent],
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

  previousTabIndex: number = -1;
  tabOrder = ['log', 'specialty', 'day', 'requested', 'finalized'];
  animationClass: string = '';

  setTab(tabId: string) {
    const currentIndex = this.tabOrder.indexOf(tabId);
    if (this.previousTabIndex === -1) {
      this.animationClass = '';
    } else {
      this.animationClass = currentIndex > this.previousTabIndex ? 'slide-left' : 'slide-right';
    }
    this.previousTabIndex = currentIndex;
    this.selectedTab = tabId;
  }
}
