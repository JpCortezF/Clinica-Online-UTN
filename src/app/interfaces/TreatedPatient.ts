export interface TreatedPatient {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  dni: string;
  profile_image_url: string | null;
  health_medical: string | null;
}