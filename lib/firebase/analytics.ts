import { analytics } from "./firebase";
import {
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
  Analytics,
} from "firebase/analytics";

/**
 * Checks if the Firebase Analytics instance is available.
 * Logs a warning if not initialized, but doesn't throw an error
 * to avoid breaking the app if Analytics fails to load.
 * @returns The Analytics instance or null.
 */
const checkAnalytics = (): Analytics | null => {
  if (!analytics) {
    // Only log warning once per session perhaps? For now, log always if null.
    // console.warn('Firebase Analytics instance not available yet.');
    return null;
  }
  return analytics;
};

/**
 * Tracks a custom event with Firebase Analytics.
 * Includes a check to ensure Analytics is initialized.
 * @param eventName - The name of the event to track.
 * @param eventParams - Optional parameters associated with the event. Values should be strings or numbers.
 */
export const trackEvent = (
  eventName: string,
  eventParams?: { [key: string]: string | number | undefined | null }
): void => {
  const analyticsInstance = checkAnalytics();
  if (analyticsInstance) {
    try {
      firebaseLogEvent(analyticsInstance, eventName, eventParams);
    } catch (error) {
      console.error(`Error logging Firebase event "${eventName}":`, error);
    }
  }
};

/**
 * Sets the user ID for Firebase Analytics.
 * Associates subsequent events with this user ID.
 * Pass null to clear the user ID (e.g., on logout).
 * @param userId - The unique identifier for the user, or null.
 */
export const trackUserId = (userId: string | null): void => {
  const analyticsInstance = checkAnalytics();
  if (analyticsInstance) {
    try {
      // Firebase expects an empty string to clear the user ID, not null.
      firebaseSetUserId(analyticsInstance, userId || "");
    } catch (error) {
      console.error("Error setting Firebase user ID:", error);
    }
  }
};

/**
 * Sets custom user properties for Firebase Analytics.
 * These properties can be used for audience segmentation.
 * @param properties - An object containing user properties to set. Values should be strings or numbers.
 */
export const trackUserProperties = (properties: {
  [key: string]: string | number | undefined | null;
}): void => {
  const analyticsInstance = checkAnalytics();
  if (analyticsInstance) {
    try {
      firebaseSetUserProperties(analyticsInstance, properties);
    } catch (error) {
      console.error("Error setting Firebase user properties:", error);
    }
  }
};
