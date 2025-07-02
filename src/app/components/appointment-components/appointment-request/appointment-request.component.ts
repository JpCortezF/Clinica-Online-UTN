import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appointment-request',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css'
})
export class AppointmentRequestComponent {
  @Input() user!: any;
  db = inject(DatabaseService);
  router = inject(Router);
  appointmentForm!: FormGroup;
  specialties: { id: number, name: string }[] = [];
  specialists: any[] = [];
  availableDates: { label: string; value: string }[] = [];
  availableTimes: string[] = [];

  constructor(private fb: FormBuilder){}

  async ngOnInit() {
    this.appointmentForm = this.fb.group({
      specialtyId: ['', Validators.required],
      specialistId: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
    });
    this.loadSpecialties();

    this.appointmentForm.get('specialtyId')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadSpecialists(value);
        this.appointmentForm.get('specialistId')?.reset();
      }
    });

    this.appointmentForm.get('specialistId')?.valueChanges.subscribe(value => {
      this.loadDates(value);
    });

    this.appointmentForm.get('date')?.valueChanges.subscribe(value => {
      this.loadTimes(value);
    });
  }

  selectSpecialty(id: number) {
    this.appointmentForm.get('specialtyId')?.setValue(id);
    this.appointmentForm.get('specialtyId')?.markAsTouched();
  }


  async loadSpecialties() {
    this.specialties = await this.db.getSpecialties();
  }

  async loadSpecialists(specialty_id: number) {
    this.specialists = await this.db.getSpecialistsBySpecialty(specialty_id);
  }

  async loadDates(specialistId: number) {
    if (!specialistId) return;

    const officeHours = await this.db.getOfficeHoursBySpecialistId(specialistId);
    const today = new Date();
    const dates: { label: string; value: string }[] = [];

    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dayOfWeek = date.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();

      if (officeHours[dayOfWeek]) {
        const value = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        dates.push({
          value,
          label: label.charAt(0).toUpperCase() + label.slice(1),
        });
      }
    }

    this.availableDates = dates;
  }

  async loadTimes(dateStr: string) {
    const specialistId = this.appointmentForm.get('specialistId')?.value;
    if (!specialistId || !dateStr) return;

    const officeHours = await this.db.getOfficeHoursBySpecialistId(specialistId);

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // 👈 fecha local correcta

    const dayOfWeek = date.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase().trim();

    const daySchedule = officeHours[dayOfWeek];

    if (!daySchedule) {
      this.availableTimes = [];
      return;
    }

    const takenTimes = await this.db.getTakenTimesForDate(specialistId, dateStr);

    const times: string[] = [];
    let [startH, startM] = daySchedule.start.split(':').map(Number);
    let [endH, endM] = daySchedule.end.split(':').map(Number);

    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);

    const endLimit = new Date(date);
    endLimit.setHours(endH, endM, 0, 0);
    endLimit.setMinutes(endLimit.getMinutes() - 30);

    const now = new Date();
    const argNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const isToday = date.toDateString() === argNow.toDateString();

    while (start <= endLimit) {
      const timeStr = start.toTimeString().slice(0, 5); // "HH:mm"

      const isTaken = takenTimes.includes(timeStr);
      const isPast = isToday && start < argNow;

      if (!isTaken && !isPast) {
        times.push(timeStr);
      }

      start.setMinutes(start.getMinutes() + 30);
    }

    this.availableTimes = times;
  }

  formatTime(t: string): string {
    const dateStr = this.appointmentForm.get('date')?.value;
    if (!dateStr) return t;

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = t.split(':').map(Number);

    const date = new Date(year, month - 1, day, hour, minute);

    const formattedDate = date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const formattedTime = date.toLocaleTimeString('es-AR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${formattedDate} ${formattedTime}`;
  }

  async onSubmit() {
    if (this.appointmentForm.invalid) return;

    const form = this.appointmentForm.value;
    const [year, month, day] = form.date.split('-');
    const [hour, minute] = form.time.split(':');
    const appointmentDate = `${year}-${month}-${day} ${hour}:${minute}:00`;

    try {
      const conflict = await this.db.checkAppointmentConflict(form.specialistId, appointmentDate);

      if (conflict) {
        alert('Ese turno ya fue asignado. Elegí otro horario.');
        return;
      }

      const patientId = await this.db.getPatientIdByUserId(this.user.id);

      await this.db.insertAppointment(patientId, form.specialistId, form.specialtyId, appointmentDate);

      console.log('¡Turno solicitado con éxito!');
      this.router.navigate(['/appointment']);
      this.appointmentForm.reset(); 
    } catch (error) {
      console.error('Error al solicitar turno:', error);
    }
  }
}
