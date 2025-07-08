export type ReviewContent = {
  review: string;
  appointment_date: string;
  vital_signs?: {
    height: number;
    weight: number;
    temperature: number;
    pressure: string;
  } | null;
  extra_info?: { key: string; value: string }[] | null;
};