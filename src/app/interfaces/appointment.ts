export interface Appointment {
  id: number;
  request_message: string;
  request_date: string;
  appointment_date: string;
  status: string;
  review: string | null;
  specialist_review: string | null;
  specialty_name: string;
  specialist_name: string;
  patient_name: string;
  survey_completed: boolean;
  rating: number | null;
  specialist_id: number | null;
  // Nuevos datos opcionales
  vital_signs?: {
    height: number;
    weight: number;
    temperature: number;
    pressure: string;
  } | null;

  extra_info?: { key: string; value: string }[] | null;
}