import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { pageImages } from '../classes/pageImage';
import { Patient, Specialist, User } from '../classes/user';
import { AuthService } from './auth.service';
import { Appointment } from '../interfaces/appointment';
import { PatientProfile } from '../interfaces/PatientProfile';
import { TreatedPatient } from '../interfaces/TreatedPatient';
import { CompletedAppointment } from '../interfaces/CompletedAppointment';
import { FinalizeAppointmentData } from '../interfaces/FinalizeAppointmentData';
import { RawSpecialist } from '../interfaces/RawSpecialist';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  sb = inject(SupabaseService);
  auth = inject(AuthService);
  private imagesCache: pageImages[] | null = null;
  
  // ==================== USERS ====================
  async getAdmins(): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('users')
      .select('id, first_name, last_name, age, dni, email, profile_image_url, user_type')
      .eq('user_type', 'admin')

    if (error) throw error;
    return data;
  }

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
          profile_image_url,
          user_type
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
        id,
        health_medical,
        second_profile_image_url
      )
    `)
    .eq('id', userId)
    .single<PatientProfile>();

  if (error || !data) {
    console.error('Error al obtener datos del paciente:', error);
    return null;
  }
  const patientData = data.patients as { id: number, health_medical: string, second_profile_image_url: string };
  
  return {
     first_name: data.first_name,
      last_name: data.last_name,
      age: data.age,
      email: data.email,
      dni: data.dni,
      profile_image_url: data.profile_image_url,
      id: patientData?.id || null,
      health_medical: patientData?.health_medical || null,
      second_profile_image_url: patientData?.second_profile_image_url || null
  };
}

async getFullHistoryForPatient(patientId: number): Promise<CompletedAppointment[]> {
  const { data, error } = await this.sb.supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      review,
      rating,
      specialties(name)
    `)
    .eq('patient_id', patientId)
    .eq('status', 'realizado');
  console.log('Datos de historia clínica:', data);
  if (error) {
    console.error('Error al obtener historia clínica:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    appointment_date: row.appointment_date,
    review: row.review,
    rating: row.rating,
    specialty: row.specialties?.name ?? 'Sin especialidad'
  }));
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
          email,
          profile_image_url,
          user_type
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

  async getSpecialistByUserId(userId: number): Promise<{ id: number } | null> {
    const { data, error } = await this.sb.supabase
      .from('specialists')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error al obtener especialista por user_id:', error);
      return null;
    }

    return data;
  }

  async getSpecialistsBySpecialtyId(specialtyId: number): Promise<any[]> {
    if (specialtyId == null) {
      console.warn('No se recibió specialtyId válido');
      return [];
    }
    // Obtener relaciones entre especialistas y la especialidad
    const { data: relData, error: relError } = await this.sb.supabase
      .from('specialist_specialties')
      .select('specialist_id').eq('specialty_id', specialtyId);

    if (relError || !relData?.length) {
      console.error('Error obteniendo relaciones:', relError);
      return [];
    }

    const specialistIds = relData.map(r => r.specialist_id).filter(id => id != null);
    if (specialistIds.length === 0) return [];

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

  
  async getSpecialistsBySpecialty(specialtyId: number): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('specialists')
      .select(`
        id,
        office_hours,
        status,
        user:users (
          first_name,
          last_name,
          profile_image_url
        ),
        specialist_specialties!inner (
          specialty_id
        )
      `)
      .eq('status', 'habilitado')
      .eq('specialist_specialties.specialty_id', specialtyId)
      .not('office_hours', 'is', null);
      
    if (error) throw error;

    return data || [];
  }

  async getRawSpecialistsWithAppointments(patientId: number): Promise<RawSpecialist[]> {
    const rawAppointments = await this.getRawAppointmentsByPatientId(patientId);
    const specialistIds = [...new Set(rawAppointments.map(a => a.specialist_id))];

    const specialists: RawSpecialist[] = [];

    for (const id of specialistIds) {
      // 1. Obtener el user_id del especialista
      const { data: specialistInfo, error: error1 } = await this.sb.supabase
        .from('specialists')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (error1 || !specialistInfo?.user_id) continue;

      // 2. Obtener los datos del usuario
      const { data: userInfo, error: error2 } = await this.sb.supabase
        .from('users')
        .select('id, first_name, last_name, profile_image_url')
        .eq('id', specialistInfo.user_id)
        .single();

      if (error2 || !userInfo) continue;

      // 3. Armar el objeto RawSpecialist
      specialists.push({
        id: specialistInfo.id,
        user: {
          id: userInfo.id,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          profile_image_url: userInfo.profile_image_url
        }
      });
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
  
  async getSpecialties(): Promise<{ id: number, name: string, img_specialty: string }[]> {
    const { data, error } = await this.sb.supabase
      .from('specialties')
      .select('id, name, img_specialty')
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
  async getRawAppointmentsByPatientId(patientId: number): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId);

    if (error) throw error;
    return data || [];
  }

  async getFullAppointments(patientId: number): Promise<Appointment[]> {
    const rawAppointments = await this.getRawAppointmentsByPatientId(patientId);
    const appointments: Appointment[] = [];

    for (const a of rawAppointments) {
      const specialistInfo = await this.sb.supabase
        .from('specialists')
        .select('user_id')
        .eq('id', a.specialist_id)
        .single();

      const userId = specialistInfo.data?.user_id;

      let specialistName = 'Sin nombre';
      if (userId) {
        const userInfo = await this.sb.supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        if (userInfo.data) {
          specialistName = `${userInfo.data.first_name} ${userInfo.data.last_name}`;
        }
      }

      // Nombre de la especialidad
      const specialtyRes = await this.sb.supabase
        .from('specialties')
        .select('name')
        .eq('id', a.specialty_id)
        .single();

      const specialtyName = specialtyRes.data?.name ?? 'Sin especialidad';

      appointments.push({
        id: a.id,
        request_message: a.request_message,
        request_date: a.request_date,
        appointment_date: a.appointment_date,
        status: a.status,
        review: a.review,
        specialist_review: a.specialist_review,
        patient_name: '',
        specialist_name: specialistName,
        specialty_name: specialtyName,
        survey_completed: a.survey_completed,
        specialist_id: a.specialist_id,
        rating: a.rating,
        vital_signs: a.vital_signs,
        extra_info: a.extra_info
      });
    }

    return appointments;
  }

  async getAppointmentsByPatientId(patientId: number): Promise<Appointment[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        id,
        specialist_id,
        request_message,
        request_date,
        appointment_date,
        status,
        review,
        specialist_review,
        specialties(name),
        specialists(user:users(first_name, last_name)),
        survey_completed,
        rating
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
        specialist_review: a.specialist_review,
        patient_name: '',
        specialist_id: a.specialist_id,
        specialist_name: specialistUser
          ? `${specialistUser.first_name} ${specialistUser.last_name}`
          : 'Sin nombre',
        specialty_name: specialtyName,
        survey_completed: a.survey_completed,
        rating: a.rating
      };
    });
  }

  async getAppointmentsForPatientWithSpecialist(patientId: number, specialistId: number) {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`appointment_date, review`)
      .eq('patient_id', patientId)
      .eq('specialist_id', specialistId)
      .eq('status', 'realizado');

    if (error) throw error;
    return data || [];
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
        id, specialist_id, request_message, request_date, appointment_date, status, review, specialist_review, survey_completed, rating,
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
      specialist_review: a.specialist_review,
      survey_completed: a.survey_completed,
      rating: a.rating,
      specialist_id: a.specialist_id,
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
        id, specialist_id, request_message, request_date, appointment_date, status, review, specialist_review, vital_signs, extra_info,
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
      specialist_review: a.specialist_review,   
      survey_completed: a.survey_completed ?? false,
      rating: a.rating,
      specialist_id: a.specialist_id,
      specialist_name: '',
      patient_name: `${a.patient.user.first_name} ${a.patient.user.last_name}`,
      specialty_name: a.specialty.name,
      vital_signs: a.vital_signs ?? undefined,
      extra_info: a.extra_info ?? undefined
    }));
  }

  async updateAppointmentStatus(appointmentId: number, status: string, reason?: string): Promise<boolean> {
    const updateData: any = { status };
    if (reason) updateData.specialist_review = reason;

    const { error } = await this.sb.supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error al actualizar estado del turno:', error);
      return false;
    }
    return true;
  }

  async finalizeAppointment(id: number, data: FinalizeAppointmentData): Promise<boolean> {
    const { specialist_review, vital_signs, extra_info } = data;

    const updates = {
      status: 'realizado',
      specialist_review,
      vital_signs,
      extra_info: extra_info ?? null
    };

    const { error } = await this.sb.supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error al finalizar el turno:', error);
      return false;
    }

    return true;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const { error } = await this.sb.supabase
    .from('appointments')
    .update({ status: 'eliminado' })
    .eq('id', id);

    if (error) {
      console.error('Error al marcar el turno como eliminado:', error);
      return false;
    }
    return true;
  }

  async getPatientsTreatedBySpecialist(specialistId: number): Promise<TreatedPatient[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        patient_id,
        patients!appointments_patient_id_fkey (
          health_medical,
          id,
          users!patients_user_id_fkey (
            id, first_name, last_name, age, dni, profile_image_url
          )
        )
      `)
      .eq('specialist_id', specialistId)
      .eq('status', 'realizado');

    if (error) {
      console.error('Error al obtener pacientes atendidos:', error);
      return [];
    }

    const uniqueMap = new Map<number, TreatedPatient>();

    for (const row of data) {
      const patient = Array.isArray(row.patients) ? row.patients[0] : row.patients;
      const user = Array.isArray(patient?.users) ? patient.users[0] : patient?.users;
      if (user && user.id) {
        uniqueMap.set(row.patient_id, {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          age: user.age,
          dni: user.dni,
          profile_image_url: user.profile_image_url,
          patient_id: patient.id,
          health_medical: patient.health_medical ?? null
        });
      }
    }

    return Array.from(uniqueMap.values());
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

  async getTakenTimesForDate(specialistId: number, dateStr: string): Promise<string[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select('appointment_date')
      .eq('specialist_id', specialistId)
      .in('status', ['pendiente', 'realizado', 'aceptado'])
      .gte('appointment_date', `${dateStr}T00:00:00`)
      .lt('appointment_date', `${dateStr}T23:59:59`);

    if (error) throw error;

    return (data || []).map(appt => {
      const date = new Date(appt.appointment_date);
      return date.toTimeString().slice(0, 5); // "HH:mm"
    });
  }

  async submitSurvey(appointmentId: number, comment: string, rating: number): Promise<boolean> {
    const { error } = await this.sb.supabase
      .from('appointments')
      .update({ 
        survey_completed: true,
        review: comment,
        rating: rating
      })
      .eq('id', appointmentId);

    if (error) {
      console.error('Error al enviar la encuesta:', error);
      return false;
    }
    return true;
  }

  async getCompletedAppointments(patientId: number, specialistId: number): Promise<CompletedAppointment[]> {
    const { data, error } = await this.sb.supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        review,
        rating,
        specialties(name)
      `)
      .eq('patient_id', patientId)
      .eq('specialist_id', specialistId)
      .eq('status', 'realizado');

    if (error) {
      console.error('Error al obtener turnos realizados:', error);
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      appointment_date: row.appointment_date,
      review: row.review,
      rating: row.rating,
      specialty: row.specialties?.name ?? 'Sin especialidad'
    }));
  }
  
  // ==================== PAGE IMAGES ====================
  async getPageImages(): Promise<pageImages[]> {
    if (this.imagesCache) return this.imagesCache;

    const { data } = await this.sb.supabase.from('page_images').select('*').order('id', { ascending: true });
    this.imagesCache = data?.map(s => new pageImages(s)) || [];
    return this.imagesCache;
  }
}
