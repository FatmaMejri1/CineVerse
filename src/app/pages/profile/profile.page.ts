import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent } from '@ionic/angular';

import {
  Camera,
  CameraResultType,
  CameraSource
} from '@capacitor/camera';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CineUser } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonContent
  ]
})
export class ProfilePage implements OnInit {

  userProfile: CineUser | null = null;
  email = '';
  isLoading = true;
  errorMessage = '';

  // Profile Edit State
  isEditingInfo = false;
  isSavingInfo = false;
  editFirstName = '';
  editLastName = '';
  editAge: number | null = null;
  infoSuccessMessage = '';
  infoErrorMessage = '';

  // Profile photo state
  isTakingPhoto = false;
  photoSuccessMessage = '';

  // Password modification state
  showPasswordSection = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  showPasswordText = false;
  isPasswordLoading = false;
  passwordErrorMessage = '';
  passwordSuccessMessage = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------

  async loadProfile(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();

      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      this.email = user.email || '';

      const profile = await this.userService.getUserProfile(user.uid);

      if (profile) {
        this.userProfile = profile;
      } else {
        // Fallback if profile document doesn't exist
        this.userProfile = {
          uid: user.uid,
          firstName: user.displayName?.split(' ')[0] || 'CineVerse',
          lastName: user.displayName?.split(' ')[1] || 'Fan',
          age: 20,
          email: user.email || '',
          role: 'user',
          active: true
        };
      }

      this.initEditForm();

    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.errorMessage = error?.message || 'Failed to load profile.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // --------------------------------------------------
  // EDIT USER INFORMATION
  // --------------------------------------------------

  initEditForm(): void {
    if (this.userProfile) {
      this.editFirstName = this.userProfile.firstName || '';
      this.editLastName = this.userProfile.lastName || '';
      this.editAge = this.userProfile.age || null;
    }
  }

  toggleEditInfo(): void {
    this.isEditingInfo = !this.isEditingInfo;
    this.infoErrorMessage = '';
    this.infoSuccessMessage = '';

    if (this.isEditingInfo) {
      this.initEditForm();
    }
  }

  async saveProfileInfo(): Promise<void> {
    this.infoErrorMessage = '';
    this.infoSuccessMessage = '';

    const first = this.editFirstName.trim();
    const last = this.editLastName.trim();

    if (!first) {
      this.infoErrorMessage = 'Please enter your first name.';
      return;
    }

    if (!last) {
      this.infoErrorMessage = 'Please enter your last name.';
      return;
    }

    if (this.editAge !== null && (this.editAge < 5 || this.editAge > 120)) {
      this.infoErrorMessage = 'Please enter a valid age between 5 and 120.';
      return;
    }

    if (!this.userProfile?.uid) {
      this.infoErrorMessage = 'User session not found.';
      return;
    }

    this.isSavingInfo = true;
    this.cdr.detectChanges();

    try {
      const updates: Partial<CineUser> = {
        firstName: first,
        lastName: last,
        age: this.editAge !== null ? Number(this.editAge) : 0
      };

      // 1. Update in Firestore (private & public collections)
      await this.userService.updateUserProfile(this.userProfile.uid, updates);

      // 2. Synchronize local state
      this.userProfile.firstName = first;
      this.userProfile.lastName = last;
      this.userProfile.age = this.editAge !== null ? Number(this.editAge) : 0;

      // 3. Sync public profile
      await this.userService.syncCurrentUserPublicProfile();

      this.infoSuccessMessage = 'Profile information updated successfully!';
      this.isSavingInfo = false;
      this.isEditingInfo = false;

      setTimeout(() => {
        this.infoSuccessMessage = '';
        this.cdr.detectChanges();
      }, 3000);

    } catch (error: any) {
      console.error('Error updating profile info:', error);
      this.infoErrorMessage = error?.message || 'Failed to update profile information.';
      this.isSavingInfo = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  // --------------------------------------------------
  // CAMERA - TAKE PHOTO
  // --------------------------------------------------

  async takeProfilePhoto(): Promise<void> {
    this.errorMessage = '';
    this.photoSuccessMessage = '';
    this.isTakingPhoto = true;
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();
      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (!photo.dataUrl) {
        return;
      }

      await this.processAndSavePhoto(user.uid, photo.dataUrl);

    } catch (error: any) {
      console.error('Camera error:', error);
      if (error?.message?.toLowerCase().includes('cancel')) {
        return;
      }
      this.errorMessage = error?.message || 'Unable to open camera.';
    } finally {
      this.isTakingPhoto = false;
      this.cdr.detectChanges();
    }
  }

  // --------------------------------------------------
  // WEB / GALLERY FILE SELECTION
  // --------------------------------------------------

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.isTakingPhoto = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();
      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const photoDataUrl = reader.result as string;
          await this.processAndSavePhoto(user.uid, photoDataUrl);
        } catch (err: any) {
          this.errorMessage = err?.message || 'Failed to process selected photo.';
        } finally {
          this.isTakingPhoto = false;
          this.cdr.detectChanges();
        }
      };
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Photo selection error:', error);
      this.errorMessage = 'Unable to read selected photo.';
      this.isTakingPhoto = false;
      this.cdr.detectChanges();
    }
  }

  private async processAndSavePhoto(uid: string, dataUrl: string): Promise<void> {
    const compressedPhoto = await this.compressImage(dataUrl);

    if (this.userProfile) {
      this.userProfile.photoUrl = compressedPhoto;
    }

    // Save photo in Firestore & public profile
    await this.userService.saveProfilePhoto(uid, compressedPhoto);
    await this.userService.syncCurrentUserPublicProfile();

    this.photoSuccessMessage = 'Profile photo updated successfully!';
    setTimeout(() => {
      this.photoSuccessMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  // --------------------------------------------------
  // IMAGE COMPRESSION
  // --------------------------------------------------

  private compressImage(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 400;
        let width = image.width;
        let height = image.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > width && height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Unable to process image.'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        resolve(compressed);
      };

      image.onerror = () => {
        reject(new Error('Unable to process image.'));
      };

      image.src = dataUrl;
    });
  }

  // --------------------------------------------------
  // PASSWORD SECTION
  // --------------------------------------------------

  togglePasswordSection(): void {
    this.showPasswordSection = !this.showPasswordSection;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  toggleShowPasswordText(): void {
    this.showPasswordText = !this.showPasswordText;
  }

  async updatePassword(): Promise<void> {
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (!this.currentPassword) {
      this.passwordErrorMessage = 'Please enter your current password.';
      return;
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      this.passwordErrorMessage = 'New password must be at least 6 characters long.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorMessage = 'New passwords do not match. Please re-type.';
      return;
    }

    if (this.newPassword === this.currentPassword) {
      this.passwordErrorMessage = 'New password must be different from current password.';
      return;
    }

    this.isPasswordLoading = true;
    this.cdr.detectChanges();

    try {
      await this.authService.changePassword(
        this.currentPassword,
        this.newPassword
      );

      this.passwordSuccessMessage = 'Password updated successfully!';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';

      setTimeout(() => {
        this.showPasswordSection = false;
        this.passwordSuccessMessage = '';
        this.cdr.detectChanges();
      }, 2500);

    } catch (error: any) {
      console.error('Password update error:', error);
      const code = error?.code || '';

      if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        this.passwordErrorMessage = 'Current password is incorrect. Please try again.';
      } else if (code.includes('weak-password')) {
        this.passwordErrorMessage = 'New password is too weak. Please use at least 6 characters.';
      } else if (code.includes('too-many-requests')) {
        this.passwordErrorMessage = 'Too many failed attempts. Please wait a moment.';
      } else {
        this.passwordErrorMessage = error?.message || 'Failed to update password. Please check your credentials.';
      }

    } finally {
      this.isPasswordLoading = false;
      this.cdr.detectChanges();
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}