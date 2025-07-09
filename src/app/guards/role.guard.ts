import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowedRoles: ('admin' | 'specialist' | 'patient')[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.authReady;

    const sessionResult = await auth.sb.supabase.auth.getSession();
    const session = sessionResult.data.session;

    if (!session?.user) {
      router.navigate(['/login']);
      return false;
    }

    const user = await auth.getLoggedUserData();

    if (!user || !allowedRoles.includes(user.user_type)) {
      router.navigate(['/']);
      return false;
    }

    return true;
  };
}