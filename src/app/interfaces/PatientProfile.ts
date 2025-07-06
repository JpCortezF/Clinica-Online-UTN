export interface PatientProfile {
  id: number;
  first_name: string;
  last_name: string;
  age: number;
  email: string;
  dni: string;
  profile_image_url: string;
  patients: {
    health_medical: string;
    second_profile_image_url: string;
  };
}