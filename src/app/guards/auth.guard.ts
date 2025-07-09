import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.authReady;
  
  const { data: { session } } = await auth.sb.supabase.auth.getSession();

  if (!session?.user) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};