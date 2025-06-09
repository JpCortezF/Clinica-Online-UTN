export interface Appointment {
  id: number;
  request_message: string;
  request_date: string;
  appointment_date: string;
  status: string;
  review: string | null;
  specialty_name: string;
  specialist_name: string;
  survey_completed: boolean;
}