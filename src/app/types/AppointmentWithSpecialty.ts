export type AppointmentWithSpecialty = {
  id: number;
  specialty_id: number;
  specialties: {
    name: string;
    img_specialty: string;
  };
};
