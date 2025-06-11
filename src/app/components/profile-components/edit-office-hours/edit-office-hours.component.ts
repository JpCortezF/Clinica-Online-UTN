import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-office-hours',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-office-hours.component.html',
  styleUrl: './edit-office-hours.component.css'
})
export class EditOfficeHoursComponent {
  @Input() currentOfficeHours: any = {};
  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  editedOfficeHours: any = {};
  days: string[] = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  dayLabels: any = {
    lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sábado: 'Sábado'
  };

  start: string = '08:00';
  end: string = '17:00';
  
  ngOnInit() {
    if (!this.currentOfficeHours || typeof this.currentOfficeHours !== 'object') {
      this.currentOfficeHours = {};
    }

    this.editedOfficeHours = JSON.parse(JSON.stringify(this.currentOfficeHours));
  }

  isChecked(day: string): boolean {
    return !!this.currentOfficeHours[day];
  }

  toggleDay(day: string) {
    if (this.isChecked(day)) {
      delete this.editedOfficeHours[day];
    } else {
      this.editedOfficeHours[day] = { start: this.start, end: this.end };
    }
  }

  syncTimes() {
    for (const day of Object.keys(this.editedOfficeHours)) {
      this.editedOfficeHours[day] = { start: this.start, end: this.end };
    }
  }

  onSave() {
    this.syncTimes();
    this.save.emit(this.editedOfficeHours);
  }

  onCancel() {
    this.cancel.emit();
  }
}
