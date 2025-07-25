import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import { Patient, Specialist, User } from '../../classes/user';
import { SupabaseService } from '../../services/supabase.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs';
import { NgxCaptchaModule } from 'ngx-captcha';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, NgxCaptchaModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  db = inject(DatabaseService);
  sb = inject(SupabaseService);
  auth = inject(AuthService);
  router = inject(Router);
  userType!: 'patient' | 'specialist' | 'admin';
  form_register!: FormGroup;
  profileImageFile: File | null = null;
  secondProfileImageFile: File | null = null;
  profileImageError = '';
  secondImageError = '';

  NgxCaptchaModule = '6Ld6vXwrAAAAAClvy1pKHnRRdfbt-LgG9y93AqOK';
  captchaResponse?: string;

  newSpecialty = '';
  allSpecialties: { id: number, name: string }[] = [];
  selectedSpecialty = '';

  submitted = false;
  @ViewChild('fileInputProfile') fileInputProfile!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputSecond') fileInputSecond!: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type');
      if (type === 'patient' || type === 'specialist' || type === 'admin') {
        if(type === 'specialist'){
          this.loadSpecialties();
        }
        this.userType = type;
        this.initForm();
      }
    });
  }

  async loadSpecialties() {
    this.allSpecialties = await this.db.getSpecialties();
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
    const ageMin = (this.userType === 'admin' || this.userType === 'specialist') ? 18 : 1;

    const baseFields = {
      first_name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/)]],
      last_name: ['', [Validators.required, Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/)]],
      age: ['', [Validators.required, Validators.min(ageMin)]],
      dni: ['', [Validators.required, Validators.minLength(8)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    };

    if (this.userType === 'patient') {
      this.form_register = this.fb.group({
        ...baseFields,
        health_medical: ['', Validators.required],
      });
    } else if(this.userType === 'specialist'){
      this.form_register = this.fb.group({
        ...baseFields,
        specialties: this.fb.array([], Validators.required),
      });
    } else {
      this.form_register = this.fb.group({
        ...baseFields,
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
    if (!this.form_register) return false;
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validExtensions.includes(file.type)) {
      const errorMsg = 'Formato no válido. Use JPG, PNG o WEBP';
      type === 'profile' ? this.profileImageError = errorMsg : this.secondImageError = errorMsg;
      input.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('La imagen no debe superar los 2MB');
      input.value = '';
      return;
    }

    console.log(`Imagen cargada (${type}):`, file);

    if (type === 'profile') {
      this.profileImageFile = file;
    } else {
      this.secondProfileImageFile = file;
    }
  }

  private validarImagenes(): boolean {
    if (this.userType === 'patient') {
      if (this.profileImageFile && this.secondProfileImageFile) return true;
    } else {
      if (this.profileImageFile) return true;
    }
    return false;
  }

  async onSubmit() {
    this.submitted = true;
    this.form_register.markAllAsTouched();
    const isFormInvalid = this.form_register.invalid;
    const isImageMissing = !this.validarImagenes();
    if (isFormInvalid || isImageMissing || !this.captchaResponse) return;

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
        await this.db.updateImages(auth_id, profileUrl, secondUrl);
        const updatedUser = await this.auth.getLoggedUserData();
        this.auth.setCurrentUser(updatedUser);
      }

    } else if (this.userType === 'specialist') {
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
        const updatedUser = await this.auth.getLoggedUserData();
        this.auth.setCurrentUser(updatedUser);
      }

    } else if (this.userType === 'admin') {
      const profileUrlTemp = await this.db.uploadImage(this.profileImageFile!, 'profile');
      const admin = new User(
        this.form_register.value.first_name,
        this.form_register.value.last_name,
        this.form_register.value.age,
        this.form_register.value.dni,
        this.form_register.value.email,
        this.form_register.value.password,
        profileUrlTemp,
        'admin'
      );
      const auth_id = await this.auth.adminRegister(admin);
      if (auth_id) {
        await this.db.updateImages(auth_id, profileUrlTemp);
      }
    }

    this.form_register.reset();
    this.submitted = false;
    this.profileImageFile = null;
    this.secondProfileImageFile = null;

    this.auth.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        const redirectPath = this.userType === 'admin' ? '/account' : '/';
        this.router.navigate([redirectPath]);
      }
    });
  }
}