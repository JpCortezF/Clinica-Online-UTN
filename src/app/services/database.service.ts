import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicaServices } from '../classes/clinica-services';
import { Patient, Specialist, User, UserType } from '../classes/user';
import { AuthService } from './auth.service';
import { Appointment } from '../interfaces/appointment';

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
    if (error || !data?.user) throw error ?? new Error('No se pudo crear el usuario');

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

    const { data: specialistData, error: specialistError } = await this.sb.supabase
      .from('specialists')
      .insert({ user_id: userData.id })
      .select()
      .single();

    if (specialistError || !specialistData) throw specialistError ?? new Error('Error al insertar especialista');

    // Insertar especialidades nuevas (si no existen)
    for (const name of specialist.specialties) {
      await this.sb.supabase.from('specialties').insert({ name }).select().single()
    }

    // Obtener todos los IDs de especialidades por nombre
    const { data: allSpecs, error: getSpecsError } = await this.sb.supabase.from('specialties').select().in('name', specialist.specialties);

    if (getSpecsError || !allSpecs) throw getSpecsError ?? new Error('Error al obtener especialidades');

    // Insertar vínculos en tabla de relación
    const rels = allSpecs.map(spec => ({
      specialist_id: specialistData.id,
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

  // ==================== SPECIALISTS ====================

  async getSpecialistsBySpecialtyName(specialtyName: string): Promise<any[]> {
    const { data: specialtyData, error: specError } = await this.sb.supabase
      .from('specialties').select('id').eq('name', specialtyName).single();

    if (specError || !specialtyData) {
      console.error('Error obteniendo ID de la especialidad:', specError);
      return [];
    }

    const specialtyId = specialtyData.id;

    const { data: relData, error: relError } = await this.sb.supabase
      .from('specialist_specialties').select('specialist_id').eq('specialty_id', specialtyId);

    if (relError || !relData.length) {
      console.error('Error obteniendo relaciones:', relError);
      return [];
    }

    const specialistIds = relData.map(r => r.specialist_id);

    // Obtener info de los especialistas (join con users)
    const { data: specialists, error: specUserError } = await this.sb.supabase
      .from('specialists').select('id, user:users(first_name, last_name)').in('id', specialistIds);

    if (specUserError) {
      console.error('Error obteniendo especialistas:', specUserError);
      return [];
    }

    return specialists;
  }

  // ==================== SPECIALTIES ====================

  async getSpecialties(): Promise<string[]> {
    const { data, error } = await this.sb.supabase.from('specialties').select('name').order('name', { ascending: true });

    if (error) throw error;

    return data?.map(s => s.name) || [];
  }

  async getSpecialtiesForUser(user_id: number): Promise<string[]> {
    // 1. Buscar el especialista por su user_id
    const { data: specialist, error: specialistError } = await this.sb.supabase
      .from('specialists').select('id').eq('user_id', user_id).single();

    if (specialistError || !specialist) return [];

    // 2. Buscar los specialty_id desde la tabla intermedia
    const { data: relations, error: relError } = await this.sb.supabase
      .from('specialist_specialties').select('specialty_id').eq('specialist_id', specialist.id);

    if (relError || !relations) return [];

    const specialtyIds = relations.map(rel => rel.specialty_id);

    if (specialtyIds.length === 0) return [];

    const { data: specialties, error: specError } = await this.sb.supabase
      .from('specialties').select('name').in('id', specialtyIds);

    if (specError || !specialties) return [];

    return specialties.map(s => s.name);
  }
  
  // ==================== APPOINTMENTS ====================

  async getAppointmentsByPatientId(patientId: number): Promise<Appointment[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        id,
        request_message,
        request_date,
        appointment_date,
        status,
        review,
        specialties(name),
        specialists(user:users(first_name, last_name)),
        survey_completed
      `)
      .eq('patient_id', patientId);

    if (error) throw error;

    return (data || []).map(a => {
      const specialistUser = a.specialists?.[0]?.user?.[0];
      const specialtyName = a.specialties?.[0]?.name || 'Sin especialidad';

      return {
        id: a.id,
        request_message: a.request_message,
        request_date: a.request_date,
        appointment_date: a.appointment_date,
        status: a.status,
        review: a.review,
        specialist_name: specialistUser
          ? `${specialistUser.first_name} ${specialistUser.last_name}`
          : 'Sin nombre',
        specialty_name: specialtyName,
        survey_completed: a.survey_completed
      };
    });
  }

  // ==================== SERVICES ====================
  async getClinicaServices(): Promise<ClinicaServices[]> {
    if (this.servicesCache) return this.servicesCache;

    const { data } = await this.sb.supabase.from('clinica_services').select('*').order('id', { ascending: true });
    this.servicesCache = data?.map(s => new ClinicaServices(s)) || [];
    return this.servicesCache;
  }
}
