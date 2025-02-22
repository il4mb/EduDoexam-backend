import { initializeApp, getApps } from "firebase/app";
import admin from "firebase-admin";

let adminApp: admin.app.App | null = null;
let clientApp: import("firebase/app").FirebaseApp | null = null;

/**
 * Initialize and return the Firebase Admin SDK app instance.
 * 
 * @returns {admin.app.App} Firebase Admin app instance
 */
export const getAdmin = () => {
    if (!adminApp) {
        const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_JSON;

        if (!serviceAccountPath) {
            throw new Error("Environment variable 'FIREBASE_ADMIN_SERVICE_JSON' is not set.");
        }

        adminApp = admin.initializeApp({
            credential: admin.credential.cert(require(`../${serviceAccountPath}`)),
        });
    }
    return adminApp;
};

/**
 * Initialize and return the Firebase Client SDK app instance.
 * 
 * @returns {import("firebase/app").FirebaseApp} Firebase Client app instance
 */
export const getClient = () => {
    if (!clientApp) {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            appId: process.env.FIREBASE_APP_ID,
        };

        // Validate essential environment variables
        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
            throw new Error("Missing Firebase configuration in environment variables.");
        }

        // Initialize the client app only if it hasn't been initialized
        if (!getApps().length) {
            clientApp = initializeApp(firebaseConfig);
        }
    }
    return clientApp;
};
