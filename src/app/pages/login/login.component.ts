import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  fb = inject(FormBuilder);
  auth = inject(AuthService);
  sb = inject(SupabaseService);
  router = inject(Router);
  form_login!: FormGroup;
  loginError = '';
  email: string = "";
  password: string = "";


  ngOnInit(): void {
    this.form_login = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  invalid(control: string) {
    if (!this.form_login) return false;
    const c = this.form_login.get(control);
    return !!(c && c.invalid && c.touched);
  }
  
  quickLogin(email: string, password: string) {
    this.form_login = this.fb.group({
      email: email,
      password: password
    });

    this.onSubmit();
  }

  async onSubmit() {
    this.form_login.markAllAsTouched();
    if (this.form_login.invalid) return;
    
    const { email, password } = this.form_login.value;
    const { error } = await this.sb.supabase.auth.signInWithPassword({email, password});
    
    if (error) {
      this.loginError = 'Email o contraseña incorrectos.';
      return;
    }

    this.auth.currentUser$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }
}
