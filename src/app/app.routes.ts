import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'account', loadComponent: () => import('./pages/account/account.component').then((archivo) => archivo.AccountComponent)},
  { path: 'register/:type', loadComponent: () => import('./pages/register/register.component').then((archivo) => archivo.RegisterComponent)},
  { path: 'login',  loadComponent: () => import('./pages/login/login.component').then((archivo) => archivo.LoginComponent)},
  { path: 'specialist-profile', loadComponent: () => import('./pages/specialist-profile/specialist-profile.component').then((archivo) => archivo.SpecialistProfileComponent)},
  { path: 'appointment',  loadComponent: () => import('./pages/appointment/appointment.component').then((archivo) => archivo.AppointmentComponent)},
];
