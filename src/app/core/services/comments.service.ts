import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { UserService } from './user.service';

export interface CommunityComment {
  id?: string;
  authorUid: string;
  authorName: string;
  authorPhotoUrl?: string;
  text: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class CommentsService {

  constructor(
    private userService: UserService
  ) { }

  /**
   * Fetch all comments for a given community member's profile
   * Stored under: publicProfiles/{profileUid}/comments
   */
  async getComments(profileUid: string): Promise<CommunityComment[]> {
    if (!profileUid) {
      return [];
    }

    const commentsRef = collection(db, 'publicProfiles', profileUid, 'comments');

    try {
      // Order by createdAt ascending so discussion flows chronologically
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          authorUid: data['authorUid'] || '',
          authorName: data['authorName'] || 'CineVerse Fan',
          authorPhotoUrl: data['authorPhotoUrl'] || '',
          text: data['text'] || '',
          createdAt: data['createdAt']
        } as CommunityComment;
      });
    } catch (err) {
      // Fallback without orderBy in case a Firestore composite index is missing
      const snapshot = await getDocs(commentsRef);
      const comments = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          authorUid: data['authorUid'] || '',
          authorName: data['authorName'] || 'CineVerse Fan',
          authorPhotoUrl: data['authorPhotoUrl'] || '',
          text: data['text'] || '',
          createdAt: data['createdAt']
        } as CommunityComment;
      });

      // Sort in memory by timestamp
      return comments.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeA - timeB;
      });
    }
  }

  /**
   * Post a new comment on a matching user's card
   */
  async addComment(profileUid: string, text: string): Promise<CommunityComment> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('You must be logged in to participate in the community discussion.');
    }

    const cleanText = text?.trim();
    if (!cleanText) {
      throw new Error('Comment cannot be empty.');
    }

    if (cleanText.length > 500) {
      throw new Error('Comment exceeds maximum length of 500 characters.');
    }

    // Determine author name & photo
    let authorName = currentUser.displayName || '';
    let authorPhotoUrl = currentUser.photoURL || '';

    // Check private profile for best name & photo
    try {
      const userProfile = await this.userService.getUserProfile(currentUser.uid);
      if (userProfile) {
        if (userProfile.firstName || userProfile.lastName) {
          authorName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
        }
        if (userProfile.photoUrl) {
          authorPhotoUrl = userProfile.photoUrl;
        }
      }
    } catch {
      // ignore, fallback to auth
    }

    if (!authorName) {
      authorName = currentUser.email?.split('@')[0] || 'CineVerse Member';
    }

    const commentsRef = collection(db, 'publicProfiles', profileUid, 'comments');

    const newCommentData = {
      authorUid: currentUser.uid,
      authorName,
      authorPhotoUrl,
      text: cleanText,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(commentsRef, newCommentData);

    return {
      id: docRef.id,
      ...newCommentData,
      createdAt: new Date()
    };
  }

  /**
   * Delete own comment if needed
   */
  async deleteComment(profileUid: string, commentId: string): Promise<void> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('You must be logged in to delete comments.');
    }

    const commentRef = doc(db, 'publicProfiles', profileUid, 'comments', commentId);
    await deleteDoc(commentRef);
  }
}
