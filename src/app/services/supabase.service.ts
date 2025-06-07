import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  supabase: SupabaseClient<any, 'public', any>;

  constructor() { 
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }
}
