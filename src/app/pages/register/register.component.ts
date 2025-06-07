import { Component, ElementRef, inject, Input, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import { Patient, Specialist } from '../../classes/user';
import { SupabaseService } from '../../services/supabase.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  db = inject(DatabaseService);
  sb = inject(SupabaseService);
  userType: 'patient' | 'specialist' | null = null; 
  form_register!: FormGroup;
  profileImageFile: File | null = null;
  secondProfileImageFile: File | null = null;

  newSpecialty = '';
  allSpecialties: { id: number; name: string }[] = [];
  selectedSpecialty = '';

  submitted = false;
  @ViewChild('fileInputProfile') fileInputProfile!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputSecond') fileInputSecond!: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder, private route: ActivatedRoute) {}

  ngOnInit() {
    const type = this.route.snapshot.paramMap.get('type');
    if (type === 'patient' || type === 'specialist') {
      this.userType = type;
      this.loadSpecialties();
    }
  }

  async loadSpecialties() {
    // const { data, error } = await this.sb.supabase.from('specialties').select();
    // if (!error) this.allSpecialties = data;
  }

  addSpecialtyFromSelect() {
    if (this.selectedSpecialty && !this.specialties.value.includes(this.selectedSpecialty)) {
      this.specialties.push(new FormControl<string>(this.selectedSpecialty, { nonNullable: true, validators: [Validators.required] }));
      this.selectedSpecialty = '';
    }
  }

  selectType(type: 'patient' | 'specialist') {
    this.userType = type;
    this.initForm();
  }

  initForm() {
    const baseFields = {
      first_name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/)]],
      last_name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/)]],
      age: ['', [Validators.required, Validators.min(14)]],
      dni: ['', [Validators.required, Validators.minLength(8)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    };

    if (this.userType === 'patient') {
      this.form_register = this.fb.group({
        ...baseFields,
        health_medical: ['', Validators.required],
      });
    } else {
      this.form_register = this.fb.group({
        ...baseFields,
        specialties: this.fb.array([], Validators.required),
      });
    }
  }

  get specialties(): FormArray<FormControl<string>> {
    return this.form_register.get('specialties') as FormArray<FormControl<string>>;
  }

  addSpecialty() {
  const trimmed = this.newSpecialty.trim();
  if (trimmed) {
    this.specialties.push(new FormControl<string>(trimmed, { nonNullable: true, validators: [Validators.required] }));
    this.newSpecialty = '';
  }
}

  removeSpecialty(index: number) {
    this.specialties.removeAt(index);
  }

  invalid(controlName: string): boolean {
    const control = this.form_register.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  triggerFileInput(type: 'profile' | 'second') {
    if (type === 'profile') {
      this.fileInputProfile.nativeElement.click();
    } else {
      this.fileInputSecond.nativeElement.click();
    }
  }

  handleImageUpload(event: Event, type: 'profile' | 'second') {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (type === 'profile') this.profileImageFile = file;
    else this.secondProfileImageFile = file;
  }

  async onSubmit() {
    this.submitted = true;
    this.form_register.markAllAsTouched();

    const isFormInvalid = this.form_register.invalid;
    const isImageMissing = !this.profileImageFile || (this.userType === 'patient' && !this.secondProfileImageFile);
    console.log(this.profileImageFile, this.secondProfileImageFile);
    if (isFormInvalid || isImageMissing) return;

    let profileUrl = '';
    let secondUrl = '';

    if (this.userType === 'patient') {
      const patient = new Patient(
        this.form_register.value.first_name,
        this.form_register.value.last_name,
        this.form_register.value.age,
        this.form_register.value.dni,
        this.form_register.value.email,
        this.form_register.value.password,
        '',
        '',
        this.form_register.value.health_medical
      );
      await this.db.registerPatient(patient);

      profileUrl = await this.db.uploadImage(this.profileImageFile!, 'profile');
      secondUrl = await this.db.uploadImage(this.secondProfileImageFile!, 'second');

      const session = await this.sb.supabase.auth.getSession();

      const auth_id = session.data.session?.user?.id;
      if (auth_id) {
        await this.db.updateImages(auth_id, profileUrl);
      }
    } else {
      const specialist = new Specialist(
        this.form_register.value.first_name,
        this.form_register.value.last_name,
        this.form_register.value.age,
        this.form_register.value.dni,
        this.form_register.value.email,
        this.form_register.value.password,
        '',
        this.specialties.value
      );
      await this.db.registerSpecialist(specialist);

      profileUrl = await this.db.uploadImage(this.profileImageFile!, 'profile');

      const session = await this.sb.supabase.auth.getSession();
      const auth_id = session.data.session?.user?.id;
      if (auth_id) {
        await this.db.updateImages(auth_id, profileUrl);
      }
    }

    console.log('¡Registro exitoso!');
    this.form_register.reset();
    this.submitted = false;
    this.profileImageFile = null;
    this.secondProfileImageFile = null;
    this.userType = null;
  }
}