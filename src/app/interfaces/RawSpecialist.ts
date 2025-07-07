export interface RawSpecialistUser {
  id: number;
  first_name: string;
  last_name: string;
  profile_image_url: string;
}

export interface RawSpecialist {
  id: number;
  user: RawSpecialistUser;
}