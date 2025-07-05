export interface CompletedAppointment {
  id: number;
  appointment_date: string;
  specialty: string;
  review: string | null;
  rating: number | null;
}