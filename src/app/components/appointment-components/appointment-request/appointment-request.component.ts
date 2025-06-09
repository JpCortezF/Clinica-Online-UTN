import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../../services/database.service';

@Component({
  selector: 'app-appointment-request',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './appointment-request.component.html',
  styleUrl: './appointment-request.component.css'
})
export class AppointmentRequestComponent {
  db = inject(DatabaseService);
  appointmentForm!: FormGroup;
  specialties: string[] = [];
  specialists: any[] = [];
  availableDates: string[] = [];
  availableTimes: string[] = [];

  constructor(private fb: FormBuilder){}

  async ngOnInit() {
    this.appointmentForm = this.fb.group({
      specialty: ['', Validators.required],
      specialistId: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
    });

    this.loadSpecialties();

    this.appointmentForm.get('specialty')?.valueChanges.subscribe(value => {
      this.loadSpecialists(value);
      this.appointmentForm.get('specialistId')?.reset();
    });

    this.appointmentForm.get('specialistId')?.valueChanges.subscribe(value => {
      this.loadDates(value);
    });

    this.appointmentForm.get('date')?.valueChanges.subscribe(value => {
      this.loadTimes(value);
    });
  }

  async loadSpecialties() {
    this.specialties = await this.db.getSpecialties();
  }

  async loadSpecialists(specialty: string) {
    this.specialists = await this.db.getSpecialistsBySpecialtyName(specialty);
  }

  loadDates(specialistId: string) {
    this.availableDates = ['2025-07-23', '2025-07-24', '2025-07-25'];
  }

  loadTimes(date: string) {
    this.availableTimes = ['09:00', '11:00', '13:30', '15:00'];
  }

  onSubmit() {
    if (this.appointmentForm.invalid) return;

    console.log('Turno solicitado:', this.appointmentForm.value);
    // Lógica para insertar el turno en Supabase
  }
}
