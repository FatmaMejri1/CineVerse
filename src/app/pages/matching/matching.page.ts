import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import {
  MatchingService,
  CommunityMatch
} from '../../core/services/matching.service';
import {
  CommentsService,
  CommunityComment
} from '../../core/services/comments.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-matching',
  templateUrl: './matching.page.html',
  styleUrls: ['./matching.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent
  ]
})
export class MatchingPage implements OnInit {

  matches: CommunityMatch[] = [];
  myFavoritesCount = 0;
  currentUserId: string | null = null;

  isLoading = true;
  errorMessage = '';

  // Comments state keyed by matching user's UID
  commentsMap: { [profileUid: string]: CommunityComment[] } = {};
  loadingCommentsMap: { [profileUid: string]: boolean } = {};
  newCommentTexts: { [profileUid: string]: string } = {};
  submittingCommentMap: { [profileUid: string]: boolean } = {};
  commentErrorMap: { [profileUid: string]: string } = {};

  constructor(
    private matchingService: MatchingService,
    private commentsService: CommentsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    const user = await this.authService.waitForAuth();
    this.currentUserId = user?.uid || null;
    await this.loadMatches();
  }

  async ionViewWillEnter(): Promise<void> {
    const user = await this.authService.waitForAuth();
    this.currentUserId = user?.uid || null;
    await this.loadMatches();
  }

  /**
   * Load matching users and their comment boards
   */
  async loadMatches(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      this.myFavoritesCount = await this.matchingService.getMyFavoritesCount();
      this.matches = await this.matchingService.findMatches();

      console.log('Matches found:', this.matches);

      // Load comments for each matching user card
      for (const match of this.matches) {
        this.loadCommentsForMatch(match.uid);
      }

    } catch (error: any) {
      console.error('Matching error:', error);
      this.errorMessage = error?.message || 'Unable to load movie community.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Load comments for a specific match card
   */
  async loadCommentsForMatch(profileUid: string): Promise<void> {
    this.loadingCommentsMap[profileUid] = true;
    this.commentErrorMap[profileUid] = '';
    this.cdr.detectChanges();

    try {
      const comments = await this.commentsService.getComments(profileUid);
      this.commentsMap[profileUid] = comments;
    } catch (err: any) {
      console.error(`Failed to load comments for ${profileUid}:`, err);
      this.commentErrorMap[profileUid] = 'Could not load discussion.';
    } finally {
      this.loadingCommentsMap[profileUid] = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Post a new comment to a matching user's discussion
   */
  async postComment(profileUid: string): Promise<void> {
    const text = this.newCommentTexts[profileUid]?.trim();
    if (!text) {
      return;
    }

    this.submittingCommentMap[profileUid] = true;
    this.commentErrorMap[profileUid] = '';
    this.cdr.detectChanges();

    try {
      const added = await this.commentsService.addComment(profileUid, text);

      // Immediately append to local list
      if (!this.commentsMap[profileUid]) {
        this.commentsMap[profileUid] = [];
      }
      this.commentsMap[profileUid].push(added);

      // Reset text input
      this.newCommentTexts[profileUid] = '';
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      this.commentErrorMap[profileUid] = err?.message || 'Failed to post comment.';
    } finally {
      this.submittingCommentMap[profileUid] = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Delete own comment
   */
  async deleteComment(profileUid: string, commentId?: string): Promise<void> {
    if (!commentId) return;

    try {
      await this.commentsService.deleteComment(profileUid, commentId);
      if (this.commentsMap[profileUid]) {
        this.commentsMap[profileUid] = this.commentsMap[profileUid].filter(c => c.id !== commentId);
        this.cdr.detectChanges();
      }
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      alert('Unable to delete comment.');
    }
  }

  /**
   * Safe timestamp formatter for Firestore timestamps, Dates, or numbers
   */
  formatCommentDate(createdAt: any): string {
    if (!createdAt) return 'Just now';

    let date: Date;
    if (createdAt instanceof Date) {
      date = createdAt;
    } else if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt?.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else {
      return 'Recently';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}