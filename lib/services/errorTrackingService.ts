import { logEvent, Analytics } from 'firebase/analytics';
import { getAnalytics } from '@/lib/firebase/firebase';
import { FirebaseError } from 'firebase/app';

/**
 * Error Tracking Service
 * Provides utilities for tracking errors and events in the application
 */
export class ErrorTrackingService {
  /**
   * Track an error in Firebase Analytics
   * @param error The error object
   * @param context Additional context about where the error occurred
   */
  static trackError(error: unknown, context: { 
    component?: string; 
    action?: string; 
    userId?: string;
    gameId?: string;
    additionalData?: Record<string, any>;
  }): void {
    // Get analytics instance
    const analytics = getAnalytics();
    if (!analytics) {
      console.error('Analytics not initialized, cannot track error');
      return;
    }

    // Format error data
    const errorData = this.formatErrorData(error, context);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error tracked:', errorData);
    }
    
    // Log to Firebase Analytics
    logEvent(analytics, 'app_error', errorData);
    
    // You could also send to a custom error tracking service here
  }

  /**
   * Track a game event in Firebase Analytics
   * @param eventName The name of the event
   * @param eventData Additional data about the event
   */
  static trackGameEvent(eventName: string, eventData: Record<string, any>): void {
    const analytics = getAnalytics();
    if (!analytics) {
      console.error('Analytics not initialized, cannot track event');
      return;
    }
    
    // Log to Firebase Analytics
    logEvent(analytics, eventName, eventData);
  }

  /**
   * Format error data for tracking
   */
  private static formatErrorData(error: unknown, context: Record<string, any>): Record<string, any> {
    const errorData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      ...context
    };

    if (error instanceof FirebaseError) {
      // Format Firebase errors
      errorData.errorCode = error.code;
      errorData.errorMessage = error.message;
      errorData.errorType = 'FirebaseError';
    } else if (error instanceof Error) {
      // Format standard errors
      errorData.errorMessage = error.message;
      errorData.errorStack = error.stack;
      errorData.errorType = error.name;
    } else {
      // Format unknown errors
      errorData.errorMessage = String(error);
      errorData.errorType = 'Unknown';
    }

    return errorData;
  }
}

// Export common event names as constants for consistency
export const GameEvents = {
  GAME_CREATED: 'game_created',
  GAME_JOINED: 'game_joined',
  GAME_STARTED: 'game_started',
  GAME_ENDED: 'game_ended',
  ROUND_STARTED: 'round_started',
  ROUND_ENDED: 'round_ended',
  CARD_SUBMITTED: 'card_submitted',
  WINNER_SELECTED: 'winner_selected',
  ERROR_STARTING_GAME: 'error_starting_game',
  ERROR_JOINING_GAME: 'error_joining_game',
  ERROR_SUBMITTING_CARD: 'error_submitting_card',
};
