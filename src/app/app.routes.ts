import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'account', loadComponent: () => import('./pages/account/account.component').then((archivo) => archivo.AccountComponent)},
  { path: 'register/:type', loadComponent: () => import('./pages/register/register.component').then((archivo) => archivo.RegisterComponent)},
  { path: 'login',  loadComponent: () => import('./pages/login/login.component').then((archivo) => archivo.LoginComponent)},
  { path: 'user-section', loadComponent: () => import('./pages/user-section/user-section.component').then((archivo) => archivo.UserSectionComponent)},
  { path: 'specialist-profile', loadComponent: () => import('./pages/specialist-profile/specialist-profile.component').then((archivo) => archivo.SpecialistProfileComponent)},
  { path: 'patients-profile', loadComponent: () => import('./pages/patients-profile/patients-profile.component').then((archivo) => archivo.PatientProfileComponent)},
  { path: 'patients-section', loadComponent: () => import('./pages/patients-section/patients-section.component').then((archivo) => archivo.PatientsSectionComponent)},
  { path: 'appointment',  loadComponent: () => import('./pages/appointment/appointment.component').then((archivo) => archivo.AppointmentComponent)},
];
