import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { CineUser } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonSpinner
  ]
})
export class AdminUsersPage implements OnInit {

  users: CineUser[] = [];
  filteredUsers: CineUser[] = [];
  currentAdminUid: string | null = null;

  isLoading = true;
  errorMessage = '';
  successFeedback = '';

  // Search & Filter
  searchTerm = '';
  statusFilter: 'ALL' | 'ACTIVE' | 'DEACTIVATED' = 'ALL';
  roleFilter: 'ALL' | 'USER' | 'ADMIN' = 'ALL';

  // Confirmation Dialog State
  showConfirmModal = false;
  confirmActionType: 'deactivate' | 'reactivate' | null = null;
  selectedUser: CineUser | null = null;
  isProcessingAction = false;
  actionError = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  private isLoaded = false;

  async ngOnInit(): Promise<void> {
    if (!this.isLoaded) {
      this.isLoaded = true;
      const currentAuth = this.authService.getCurrentUser();
      this.currentAdminUid = currentAuth?.uid || null;
      await this.loadUsers();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.isLoaded || this.users.length === 0) {
      this.isLoaded = true;
      const currentAuth = this.authService.getCurrentUser();
      this.currentAdminUid = currentAuth?.uid || null;
      await this.loadUsers();
    } else {
      this.cdr.detectChanges();
    }
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      this.users = await this.userService.getAllUsers();
      this.applyFilters();
    } catch (err: any) {
      console.error('Error fetching registered users:', err);
      this.errorMessage = err?.message || 'Failed to retrieve registered users from Firestore.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilters(): void {
    let result = [...this.users];

    // Search query
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(u =>
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.statusFilter === 'ACTIVE') {
      result = result.filter(u => u.active !== false);
    } else if (this.statusFilter === 'DEACTIVATED') {
      result = result.filter(u => u.active === false);
    }

    // Role filter
    if (this.roleFilter === 'USER') {
      result = result.filter(u => u.role !== 'admin');
    } else if (this.roleFilter === 'ADMIN') {
      result = result.filter(u => u.role === 'admin');
    }

    this.filteredUsers = result;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setStatusFilter(status: 'ALL' | 'ACTIVE' | 'DEACTIVATED'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  setRoleFilter(role: 'ALL' | 'USER' | 'ADMIN'): void {
    this.roleFilter = role;
    this.applyFilters();
  }

  // ----------------------------------------------------
  // CONFIRMATION DIALOG FOR DEACTIVATION / REACTIVATION
  // ----------------------------------------------------

  openDeactivateConfirm(user: CineUser): void {
    if (user.uid === this.currentAdminUid) {
      this.errorMessage = 'Self-deactivation is prohibited. You cannot deactivate your own account.';
      return;
    }
    if (user.role === 'admin') {
      this.errorMessage = 'Cannot deactivate another administrator account.';
      return;
    }

    this.selectedUser = user;
    this.confirmActionType = 'deactivate';
    this.actionError = '';
    this.showConfirmModal = true;
  }

  openReactivateConfirm(user: CineUser): void {
    this.selectedUser = user;
    this.confirmActionType = 'reactivate';
    this.actionError = '';
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    if (this.isProcessingAction) return;
    this.showConfirmModal = false;
    this.selectedUser = null;
    this.confirmActionType = null;
  }

  async executeConfirmedAction(): Promise<void> {
    if (!this.selectedUser || !this.confirmActionType) return;

    this.isProcessingAction = true;
    this.actionError = '';
    this.cdr.detectChanges();

    const target = this.selectedUser;

    try {
      if (this.confirmActionType === 'deactivate') {
        // NON-DESTRUCTIVE: updates active: false in users/{uid} and publicProfiles/{uid}
        await this.userService.deactivateUser(target.uid);
        this.successFeedback = `Account for ${target.firstName} ${target.lastName} (${target.email}) has been deactivated. Data and UID are fully preserved.`;
      } else {
        // NON-DESTRUCTIVE: updates active: true
        await this.userService.reactivateUser(target.uid);
        this.successFeedback = `Account for ${target.firstName} ${target.lastName} (${target.email}) has been reactivated. Access is restored.`;
      }

      this.showConfirmModal = false;
      this.selectedUser = null;
      this.confirmActionType = null;

      await this.loadUsers();

      setTimeout(() => {
        this.successFeedback = '';
        this.cdr.detectChanges();
      }, 5000);

    } catch (err: any) {
      console.error('Error applying user status change:', err);
      this.actionError = err?.message || 'Failed to update user status.';
    } finally {
      this.isProcessingAction = false;
      this.cdr.detectChanges();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
