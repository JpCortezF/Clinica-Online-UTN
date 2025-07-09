import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { roleGuard } from './guards/role.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [noAuthGuard] },
  { path: 'register/:type', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [noAuthGuard] },

  // Solo logeados:
  { path: 'user-section', loadComponent: () => import('./pages/user-section/user-section.component').then(m => m.UserSectionComponent), canActivate: [roleGuard(['admin'])] },
  { path: 'statstics', loadComponent: () => import('./pages/statstics/statstics.component').then(m => m.StatsticsComponent), canActivate: [roleGuard(['admin'])] },
  { path: 'specialist-profile', loadComponent: () => import('./pages/specialist-profile/specialist-profile.component').then(m => m.SpecialistProfileComponent), canActivate: [roleGuard(['specialist'])] },
  { path: 'patients-section', loadComponent: () => import('./pages/patients-section/patients-section.component').then(m => m.PatientsSectionComponent), canActivate: [roleGuard(['specialist'])] },
  { path: 'patients-profile', loadComponent: () => import('./pages/patients-profile/patients-profile.component').then(m => m.PatientProfileComponent), canActivate: [roleGuard(['patient'])] },
  { path: 'appointment', loadComponent: () => import('./pages/appointment/appointment.component').then(m => m.AppointmentComponent), canActivate: [roleGuard(['admin', 'specialist', 'patient'])] },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];