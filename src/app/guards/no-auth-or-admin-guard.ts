import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthOrAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.authReady;

  const sessionResult = await auth.sb.supabase.auth.getSession();
  const session = sessionResult.data.session;

  // Si no hay sesión, permitir el acceso
  if (!session?.user) return true;

  // Si hay sesión, obtener datos del usuario
  const user = await auth.getLoggedUserData();

  if (user?.user_type === 'admin') return true;

  // Si no es admin, redirigir al home
  router.navigate(['/']);
  return false;
};
