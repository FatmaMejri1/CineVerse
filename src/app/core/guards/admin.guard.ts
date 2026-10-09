import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  try {
    const user = await authService.waitForAuth();

    if (!user) {
      console.warn('Admin access denied: User not logged in.');
      await router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const profile = await userService.getUserProfile(user.uid);

    if (!profile) {
      console.warn('Admin access denied: User profile not found.');
      await router.navigate(['/home']);
      return false;
    }

    // Check if account has been deactivated
    if (profile.active === false) {
      console.warn('Admin access denied: Account is deactivated.');
      await authService.logout();
      await router.navigate(['/login'], { queryParams: { error: 'deactivated' } });
      return false;
    }

    // Check if user has admin role
    if (profile.role !== 'admin') {
      console.warn('Admin access denied: User is not an administrator.');
      await router.navigate(['/home']);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in adminGuard:', err);
    await router.navigate(['/home']);
    return false;
  }
};
