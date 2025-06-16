import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { pageImages } from '../classes/pageImage';
import { Patient, Specialist, User } from '../classes/user';
import { AuthService } from './auth.service';
import { Appointment } from '../interfaces/appointment';
import { PatientProfileResponse } from '../interfaces/PatientProfile';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  sb = inject(SupabaseService);
  auth = inject(AuthService);
  private imagesCache: pageImages[] | null = null;
  
  // ==================== USERS ====================
  async registerBaseUser(user: User): Promise<{ auth_id: string, user_id: number }> {
    const { data, error } = await this.auth.register(user.email, user.password);
    if (error || !data?.user) throw error ?? new Error('No se pudo crear el usuario');

    const auth_id = data.user.id;

    const { data: userData, error: userError } = await this.sb.supabase
      .from('users')
      .insert({
        auth_id,
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
        dni: user.dni,
        email: user.email,
        profile_image_url: user.profile_image_url,
        user_type: user.user_type,
      })
      .select()
      .single();

    if (userError || !userData) throw userError ?? new Error('Error al insertar en users');

    return { auth_id, user_id: userData.id };
  }
  
  async registerPatient(patient: Patient) {
  const { auth_id, user_id } = await this.registerBaseUser(patient);

  const { error } = await this.sb.supabase.from('patients').insert({
    user_id,
    health_medical: patient.health_medical,
    second_profile_image_url: patient.second_profile_image_url,
  });

  if (error) throw error;
}

  async registerSpecialist(specialist: Specialist) {
    const { auth_id, user_id } = await this.registerBaseUser(specialist);

    const { data: specialistData, error: specError } = await this.sb.supabase
      .from('specialists')
      .insert({ user_id })
      .select()
      .single();

    if (specError || !specialistData) throw specError ?? new Error('Error al insertar especialista');

    // Insertar especialidades nuevas si no existen
    for (const name of specialist.specialties) {
      await this.sb.supabase.from('specialties').insert({ name }).select().single();
    }

    const { data: allSpecs, error: getSpecsError } = await this.sb.supabase
      .from('specialties').select().in('name', specialist.specialties);

    if (getSpecsError || !allSpecs) throw getSpecsError;

    const rels = allSpecs.map(spec => ({
      specialist_id: specialistData.id,
      specialty_id: spec.id,
    }));

    const { error: relError } = await this.sb.supabase.from('specialist_specialties').insert(rels);
    if (relError) throw relError;
  }

  async registerAdmin(admin: User) {
    await this.registerBaseUser(admin);
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

  // ==================== PATIENTS ====================
  async getPatients(): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('patients')
      .select(`
        id,
        user_id,
        health_medical,
        second_profile_image_url,
        user:users (
          first_name,
          last_name,
          email,
          age,
          dni,
          profile_image_url
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error al obtener pacientes:', error);
      throw error;
    }

    return data || [];
  }

  async getPatientIdByUserId(userId: number): Promise<number> {
    const { data, error } = await this.sb.supabase
      .from('patients').select('id').eq('user_id', userId).single();

    if (error) {
      console.error('Error buscando patient_id:', error.message);
      throw error;
    }

    if (!data) {
      throw new Error(`No se encontró un paciente con user_id = ${userId}`);
    }

    return data.id;
  }

  async getPatientProfileData(userId: number) {
    const { data, error } = await this.sb.supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      age,
      email,
      dni,
      profile_image_url,
      patients (
        health_medical,
        second_profile_image_url
      )
    `)
    .eq('id', userId)
    .single<PatientProfileResponse>();

  if (error || !data) {
    console.error('Error al obtener datos del paciente:', error);
    return null;
  }
  const patientData = data.patients as { health_medical: string, second_profile_image_url: string };
  
  return {
     first_name: data.first_name,
      last_name: data.last_name,
      age: data.age,
      email: data.email,
      dni: data.dni,
      profile_image_url: data.profile_image_url,
      health_medical: patientData?.health_medical || null,
      second_profile_image_url: patientData?.second_profile_image_url || null
  };
}

  // ==================== SPECIALISTS ====================
  async getSpecialists(): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('specialists')
      .select(`
        id,
        status,
        user:users (
          first_name,
          last_name,
          age,
          dni,
          email
        ),
        specialist_specialties (
          specialty:specialties (
            name
          )
        )
      `)
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getSpecialistsBySpecialtyId(specialtyId: number): Promise<any[]> {
    if (specialtyId == null) {
      console.warn('No se recibió specialtyId válido');
      return [];
    }
    // 1. Obtener relaciones entre especialistas y la especialidad
    const { data: relData, error: relError } = await this.sb.supabase
      .from('specialist_specialties')
      .select('specialist_id').eq('specialty_id', specialtyId);

    if (relError || !relData?.length) {
      console.error('Error obteniendo relaciones:', relError);
      return [];
    }

    const specialistIds = relData.map(r => r.specialist_id).filter(id => id != null);
    if (specialistIds.length === 0) return [];

    // 2. Obtener información de cada especialista (join con users)
    const { data: specialists, error: specUserError } = await this.sb.supabase
      .from('specialists')
      .select('id, status, user:users(first_name, last_name)').in('id', specialistIds)
      .eq('status', 'habilitado');;

    if (specUserError) {
      console.error('Error obteniendo especialistas:', specUserError);
      return [];
    }

    return specialists;
  }

  async updateSpecialistStatus(specialistId: number, status: 'pendiente' | 'habilitado' | 'rechazado'): Promise<void> {
    const { error } = await this.sb.supabase
      .from('specialists')
      .update({ status })
      .eq('id', specialistId);

    if (error) {
      console.error('Error al actualizar el estado del especialista:', error);
      throw error;
    }
  }

  // ==================== SPECIALTIES ====================
  
  async getSpecialties(): Promise<{ id: number, name: string }[]> {
    const { data, error } = await this.sb.supabase
      .from('specialties')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getSpecialtiesForUser(user_id: number): Promise<string[]> {
    const { data: specialist, error: specialistError } = await this.sb.supabase
      .from('specialists').select('id').eq('user_id', user_id).single();

    if (specialistError || !specialist) return [];

    // Buscar los specialty_id desde la tabla intermedia
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
        patient_name: '',
        specialist_name: specialistUser
          ? `${specialistUser.first_name} ${specialistUser.last_name}`
          : 'Sin nombre',
        specialty_name: specialtyName,
        survey_completed: a.survey_completed
      };
    });
  }

  async checkAppointmentConflict(specialistId: number, dateTimeISO: string): Promise<boolean> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select('id').eq('specialist_id', specialistId).eq('appointment_date', dateTimeISO);

    if (error) throw error;

    return data.length > 0;
  }

  async insertAppointment(patientId: number, specialistId: number, specialtyId: number, appointmentDate: string): Promise<void> {
    const { error } = await this.sb.supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        specialist_id: specialistId,
        specialty_id: specialtyId,
        appointment_date: appointmentDate,
        request_date: new Date().toISOString(),
        status: 'pendiente',
      });

    if (error) throw error;
  }

  async getAppointmentsByPatient(userId: number): Promise<Appointment[]> {
    // Obtener el ID a partir del user_id
    const { data: patient, error: patientError } = await this.sb.supabase
      .from('patients')
      .select('id').eq('user_id', userId).single();

    if (patientError || !patient) {
      console.error('Error obteniendo patient_id:', patientError);
      return [];
    }

    const patientId = patient.id;

    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        id, request_message, request_date, appointment_date, status, review, survey_completed,
        specialist:specialists(id, user:users(first_name, last_name)),
        specialty:specialties(name)
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos:', error);
      return [];
    }

    return data.map((a: any) => ({
      id: a.id,
      request_message: a.request_message,
      request_date: a.request_date,
      appointment_date: a.appointment_date,
      status: a.status,
      review: a.review,
      survey_completed: a.survey_completed,
      specialist_name: `${a.specialist.user.first_name} ${a.specialist.user.last_name}`,
      patient_name: '',
      specialty_name: a.specialty.name,
    }));
  }

  async getAppointmentsBySpecialist(userId: number): Promise<Appointment[]> {
    const { data: specialist, error: specError } = await this.sb.supabase
      .from('specialists')
      .select('id').eq('user_id', userId).single();

    if (specError || !specialist) {
      console.error('Error obteniendo specialist_id:', specError);
      return [];
    }

    const specialistId = specialist.id;

    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        id, request_message, request_date, appointment_date, status, review,
        patient:patients(id, user:users(first_name, last_name)),
        specialty:specialties(name)
      `)
      .eq('specialist_id', specialistId)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error obteniendo turnos del especialista:', error);
      return [];
    }

    return data.map((a: any) => ({
      id: a.id,
      request_message: a.request_message,
      request_date: a.request_date,
      appointment_date: a.appointment_date,
      status: a.status,
      review: a.review,
      survey_completed: a.survey_completed ?? false,
      specialist_name: '',
      patient_name: `${a.patient.user.first_name} ${a.patient.user.last_name}`,
      specialty_name: a.specialty.name,
    }));
  }

  async updateAppointmentStatus(id: number, status: string, cancel_comment?: string): Promise<boolean> {
    const { error } = await this.sb.supabase
    .from('appointments').update({ status, request_message: cancel_comment}).eq('id', id).single();

    if(error){
      console.error(`Error al actualizar el turno a ${status}:`, error);
      return false;
    }
    return true;
  }

  async finalizeAppointment(id: number, review: string): Promise<boolean> {
    const { error } = await this.sb.supabase
    .from('appointments').update({ status: 'realizado', review}).eq('id', id).single();

    if(error){
      console.error('Error al finalizar el turno:', error);
      return false;
    }
    return true;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const { error } = await this.sb.supabase
    .from('appointments').delete().eq('id', id).single();

    if(error){
      console.error('Error al eliminar el turno:', error);
      return false;
    }
    return true;
  }
  // ==================== OFFICE HOURS ====================
  async getOfficeHoursByUserId(userId: number): Promise<any> {
    const { data, error } = await this.sb.supabase
      .from('specialists').select('office_hours').eq('user_id', userId).single();

    if (error) throw error;
    return data.office_hours;
  }

  async updateOfficeHours(specialistId: number, hours: any) {
    const { error } = await this.sb.supabase
      .from('specialists').update({ office_hours: hours }).eq('user_id', specialistId);

    if (error) throw error;
  }

  async getOfficeHoursBySpecialistId(specialistId: number): Promise<any> {
    const { data, error } = await this.sb.supabase
      .from('specialists').select('office_hours').eq('id', specialistId).single();

    if (error) throw error;
    return data.office_hours;
  }

  // ==================== PAGE IMAGES ====================
  async getPageImages(): Promise<pageImages[]> {
    if (this.imagesCache) return this.imagesCache;

    const { data } = await this.sb.supabase.from('page_images').select('*').order('id', { ascending: true });
    this.imagesCache = data?.map(s => new pageImages(s)) || [];
    return this.imagesCache;
  }
}
