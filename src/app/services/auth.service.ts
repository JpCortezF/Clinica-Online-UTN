import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  sb = inject(SupabaseService);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  router = inject(Router);
  authReady: Promise<void>;
  private isLoggingIn = false;

  constructor() { 
    this.authReady = this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const { data: { session } } = await this.sb.supabase.auth.getSession();
    this.currentUserSubject.next(session?.user || null);

    return new Promise<void>((resolve) => {
      const { data: listener } = this.sb.supabase.auth.onAuthStateChange((_event, session) => {
        this.currentUserSubject.next(session?.user || null);
        resolve();
      });

      setTimeout(() => resolve(), 1000);
    });
  }

  async register(email: string, password: string) {
    const { data, error } = await this.sb.supabase.auth.signUp({ email, password });
    return { data, error };
  }

  async login(email: string, password: string) {
    if (this.isLoggingIn) return { data: null };
    this.isLoggingIn = true;

    try {
        const { data, error } = await this.sb.supabase.auth.signInWithPassword({ email, password });

        if (data?.user && !error) {
            await this.sb.supabase.from('logins').insert({
                user_id: data.user.id,
                email: data.user.email,
            });
        }

        return { data, error };
    } finally {
        this.isLoggingIn = false;
    }
  }

  async logout() {
    const { error } = await this.sb.supabase.auth.signOut();
    return { error };
  }

  async getLoggedUserData() {
    const session = await this.sb.supabase.auth.getSession();
    const auth_id = session.data?.session?.user?.id;

    if (!auth_id) return null;

    const { data: userData } = await this.sb.supabase.from('users').select('*').eq('auth_id', auth_id).single();
    if (!userData) return null;

    if (userData.user_type === 'patient') {
      const { data: patientData } = await this.sb.supabase.from('patients').select('health_medical, second_profile_image_url').eq('user_id', userData.id).single();

      return {
        ...userData,
        health_medical: patientData?.health_medical || '',
      };
    }

    return userData;
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }

  async getCurrentUserEmail(): Promise<string | null> {
    const session = await this.sb.supabase.auth.getSession();
    return session.data?.session?.user?.email || null;
  }

  async adminRegister(nuevoAdmin: any): Promise<string> {
    const supabase = this.sb.sbGuest;
    const emailLimpio = nuevoAdmin.email.trim();
    const passwordLimpio = nuevoAdmin.password.trim();

    const { data, error } = await supabase.auth.signUp({
      email: emailLimpio,
      password: passwordLimpio,
    });

    if (error) throw error;

    const authId = data?.user?.id;
    if (!authId) throw new Error('No se pudo obtener el auth ID del nuevo admin');

    const { error: insertError } = await supabase.from('users').insert({
      first_name: nuevoAdmin.first_name,
      last_name: nuevoAdmin.last_name,
      age: nuevoAdmin.age,
      dni: nuevoAdmin.dni,
      profile_image_url: nuevoAdmin.profile_image_url || null,
      user_type: 'admin',
      email: emailLimpio,
      auth_id: authId,
    });

    if (insertError) throw insertError;

    return authId;
  }
}
