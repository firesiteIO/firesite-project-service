/**
 * Firebase Configuration Service
 * Provides centralized Firebase initialization and configuration
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';

/**
 * Firebase configuration object
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/**
 * Check if we should initialize Firebase
 */
const shouldInitializeFirebase = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== 'disabled_for_offline_mode' &&
         firebaseConfig.projectId;
};

/**
 * Firebase services (conditionally initialized)
 */
let app, db, auth, functions, realtimeDb;

if (shouldInitializeFirebase()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app);
    realtimeDb = getDatabase(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed, running in offline mode:', error);
  }
} else {
  console.log('📱 Running in offline mode - Firebase disabled');
}

export { db, auth, functions, realtimeDb };

/**
 * Environment configuration
 */
export const config = {
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  functionsUrl: import.meta.env.VITE_FUNCTIONS_URL,
  mcpMaxUrl: import.meta.env.VITE_MCP_MAX_URL,
  chatServiceUrl: import.meta.env.VITE_CHAT_SERVICE_URL,
  features: {
    aiEnabled: import.meta.env.VITE_ENABLE_AI_FEATURES === 'true',
    contextIntegration: import.meta.env.VITE_ENABLE_CONTEXT_INTEGRATION === 'true',
    debugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
    kanbanAi: import.meta.env.VITE_ENABLE_KANBAN_AI === 'true',
    realTime: import.meta.env.VITE_ENABLE_REAL_TIME === 'true',
    offlineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true'
  }
};

/**
 * Check if Firebase is properly configured
 * @returns {boolean} True if configured
 */
export function isFirebaseConfigured() {
  return shouldInitializeFirebase() && !!app;
}

/**
 * Get Firebase configuration for debugging
 * @returns {object} Sanitized config object
 */
export function getFirebaseConfig() {
  return {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? '[CONFIGURED]' : '[MISSING]'
  };
}

export { app };
export default app;