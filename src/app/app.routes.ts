import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'account', loadComponent: () => import('./pages/account/account.component').then((archivo) => archivo.AccountComponent)},
  { path: 'register/:type', loadComponent: () => import('./pages/register/register.component').then((archivo) => archivo.RegisterComponent)},
  { path: 'login',  loadComponent: () => import('./pages/login/login.component').then((archivo) => archivo.LoginComponent)},
];
