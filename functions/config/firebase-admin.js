const admin = require("firebase-admin");
const dotenv = require("dotenv");

// Load environment variables
const isDevelopment = process.env.NODE_ENV !== "production";
const useFirestoreEmulator = process.env.USE_FIRESTORE_EMULATOR === "true";

dotenv.config({
  path: isDevelopment ? ".env.development" : ".env.production",
});

// Load environment-specific configuration
const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  return isDevelopment
    ? require("./development.json")
    : require("./production.json");
};

/**
 * Initialize Firebase Admin with environment-specific credentials
 * @returns {admin.app.App} Initialized Firebase Admin app
 */
const initializeFirebaseAdmin = () => {
  const config = getConfig();
  const serviceAccount = require("./service-accounts/dev.json");

  try {
    // Check if Firebase Admin is already initialized
    try {
      const existingApp = admin.app();
      console.log("Firebase Admin SDK already initialized, reusing existing app");
      return existingApp;
    } catch (appError) {
      // If app() throws an error, it means no app is initialized yet
      console.log(
        "Initializing Firebase Admin SDK with project:",
        serviceAccount.project_id
      );

      // Initialize the app
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id, // Use project ID from service account
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
      });

      // Set Firestore settings with explicit location
      const firestoreSettings = {
        projectId: serviceAccount.project_id,
        databaseId: 'default',
        preferRest: true
      };
      
      console.log("Setting Firestore settings:", firestoreSettings);
      
      // Configure Firestore client options with explicit region
      const firestoreClientConfig = {
        projectId: serviceAccount.project_id,
        databaseId: 'default',
        locationId: 'us-central1' // Explicitly set the region to match the Firestore database
      };
      console.log("Configuring Firestore with region:", firestoreClientConfig.locationId);

      // Only configure emulator if explicitly requested
      if (useFirestoreEmulator) {
        process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
      }

      return app;
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error.stack);
    throw error;
  }
};

// Initialize Firebase Admin
const adminApp = initializeFirebaseAdmin();

// Get service account for settings
const serviceAccount = require("./service-accounts/dev.json");

// Export Firestore instance with settings
const db = adminApp.firestore();
db.settings({
  ignoreUndefinedProperties: true,
  preferRest: true,
  projectId: serviceAccount.project_id,
  databaseId: 'default',
  locationId: 'us-central1' // Explicitly set the region to match the Firestore database
});

console.log("Firestore initialized with region: us-central1");

module.exports = {
  admin,
  db,
  adminApp,
};
