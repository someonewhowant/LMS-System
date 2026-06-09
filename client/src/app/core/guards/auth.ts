import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const expectedRoles = route.data?.['roles'] as string[];
    if (expectedRoles && expectedRoles.length > 0) {
      const user = authService.currentUser();
      if (!user || !expectedRoles.includes(user.role)) {
        router.navigate(['/']);
        return false;
      }
    }
    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
