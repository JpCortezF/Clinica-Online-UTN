export interface FinalizeAppointmentData {
  specialist_review: string;
  vital_signs: {
    height: number;
    weight: number;
    temperature: number;
    pressure: string;
  };
  extra_info?: { key: string; value: string }[];
}