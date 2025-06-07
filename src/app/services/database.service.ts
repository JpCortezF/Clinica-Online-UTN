import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicaServices } from '../classes/clinica-services';
import { Patient, Specialist, User, UserType } from '../classes/user';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  sb = inject(SupabaseService);
  auth = inject(AuthService);
  private servicesCache: ClinicaServices[] | null = null;
  
  // ==================== USERS ====================

  async registerPatient(patient: Patient) {
    const { data, error } = await this.auth.register(patient.email, patient.password);

    if (error || !data?.user) {
      throw error ?? new Error('No se pudo crear el usuario');
    }

    const { error: signInError } = await this.sb.supabase.auth.signInWithPassword({
      email: patient.email,
      password: patient.password,
    });

    if (signInError) throw signInError;

    const auth_id = data.user.id;
    const { data: userData, error: userError } = await this.sb.supabase
      .from('users')
      .insert({
        auth_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        age: patient.age,
        dni: patient.dni,
        profile_image_url: patient.profile_image_url,
        user_type: 'patient',
      })
      .select()
      .single();

    if (userError || !userData) throw userError ?? new Error('Error al insertar en users');

    const { error: patientError } = await this.sb.supabase.from('patients').insert({
      user_id: userData.id,
      health_medical: patient.health_medical,
      second_profile_image_url: patient.second_profile_image_url,
    });

    if (patientError) throw patientError;
  }

  async registerSpecialist(specialist: Specialist) {

    const { data, error } = await this.auth.register(specialist.email, specialist.password);

    if (error || !data?.user) {
      throw error ?? new Error('No se pudo crear el usuario');
    }

    const { error: signInError } = await this.sb.supabase.auth.signInWithPassword({
      email: specialist.email,
      password: specialist.password,
    });

    if (signInError) throw signInError;

    const auth_id = data.user.id;
    const { data: userData, error: userError } = await this.sb.supabase
      .from('users')
      .insert({
        auth_id,
        first_name: specialist.first_name,
        last_name: specialist.last_name,
        age: specialist.age,
        dni: specialist.dni,
        profile_image_url: specialist.profile_image_url,
        user_type: 'specialist',
      })
      .select()
      .single();

    if (userError || !userData) throw userError ?? new Error('Error al insertar en users');

    const { data: specData, error: specialistError } = await this.sb.supabase.from('specialists').insert({ user_id: userData.id }).select().single();

    if (specialistError || !specData) throw specialistError ?? new Error('Error al insertar especialista');

    const { data: allSpecs, error: getSpecsError } = await this.sb.supabase
      .from('specialties')
      .select()
      .in('name', specialist.specialties);

    if (getSpecsError || !allSpecs) throw getSpecsError ?? new Error('Error al obtener especialidades');

    // 6. Insertar relaciones en specialist_specialties
    const rels = allSpecs.map(spec => ({
      specialist_id: specData.id,
      specialty_id: spec.id,
    }));

    const { error: relError } = await this.sb.supabase.from('specialist_specialties').insert(rels);

    if (relError) throw relError;
  }

  async updateImages(auth_id: string, profileUrl: string, secondUrl?: string) {
    const { data: user, error: userError } = await this.sb.supabase.from('users').select('id, user_type').eq('auth_id', auth_id).single();

    if (userError || !user) throw userError ?? new Error('No se pudo encontrar el usuario');

    const updates = [];

    updates.push(this.sb.supabase.from('users').update({ profile_image_url: profileUrl }).eq('id', user.id));

    if (user.user_type === 'patient' && secondUrl) {
      updates.push(this.sb.supabase.from('patients').update({ second_profile_image_url: secondUrl }).eq('user_id', user.id));
    }

    const results = await Promise.all(updates);

    const anyError = results.find(r => r.error);
    if (anyError) throw anyError.error;

    return true;
  }

  // ==================== STORAGE ====================

  async uploadImage(file: File, path: string): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;
    const fullPath = `${path}/${fileName}`;

    const { data, error } = await this.sb.supabase.storage
      .from('perfiles')
      .upload(fullPath, file);

    if (error) throw error;

    const { data: publicUrlData } = this.sb.supabase.storage
      .from('perfiles')
      .getPublicUrl(fullPath);

    return publicUrlData.publicUrl;
  }

  // ==================== SERVICES ====================
  async getClinicaServices(): Promise<ClinicaServices[]> {
    if (this.servicesCache) return this.servicesCache;

    const { data } = await this.sb.supabase.from('clinica_services').select('*').order('id', { ascending: true });
    this.servicesCache = data?.map(s => new ClinicaServices(s)) || [];
    return this.servicesCache;
  }
}
