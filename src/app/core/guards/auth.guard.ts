import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const activeAuthGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  try {
    const user = await authService.waitForAuth();

    if (!user) {
      await router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const profile = await userService.getUserProfile(user.uid);

    // If profile exists and is explicitly marked active === false
    if (profile && profile.active === false) {
      console.warn('Access denied: Account is deactivated by administrator.');
      await authService.logout();
      await router.navigate(['/login'], { queryParams: { error: 'deactivated' } });
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in activeAuthGuard:', err);
    await router.navigate(['/login']);
    return false;
  }
};
