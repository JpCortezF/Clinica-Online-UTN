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
  authReady = this.initializeAuth();

  constructor() { 
    this.initializeAuth();
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
    const { data, error } = await this.sb.supabase.auth.signInWithPassword({ email, password });
    return { data, error };
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
      const { data: patientData } = await this.sb.supabase.from('patients').select('health_medical').eq('user_id', userData.id).single();

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
}
