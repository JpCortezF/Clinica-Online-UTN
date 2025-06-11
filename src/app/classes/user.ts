export type UserType = 'patient' | 'specialist';

export class User {
  constructor(
    public first_name: string,
    public last_name: string,
    public age: number,
    public dni: string,
    public email: string,
    public password: string,
    public profile_image_url: string,
    public user_type: UserType
  ) {}
}

export class Patient extends User {
  constructor(
    first_name: string,
    last_name: string,
    age: number,
    dni: string,
    email: string,
    password: string,
    profile_image_url: string,
    public second_profile_image_url: string,
    public health_medical: string
  ) {
    super(first_name, last_name, age, dni, email, password, profile_image_url, 'patient');
  }
}

export class Specialist extends User {
  constructor(
    first_name: string,
    last_name: string,
    age: number,
    dni: string,
    email: string,
    password: string,
    profile_image_url: string,
    public specialties: string[],
    public office_hours: { [day: string]: { start: string; end: string } } = {}
  ) {
    super(first_name, last_name, age, dni, email, password, profile_image_url, 'specialist');
  }
}
