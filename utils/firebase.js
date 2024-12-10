const { initializeApp, getApps } = require("firebase/app");
const admin = require("firebase-admin");

let adminApp = null;
let clientApp = null;

const getAdmin = () => {
    if (!adminApp) {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(require(`../${process.env.FIREBASE_ADMIN_SERVICE_JSON}`)),
        });
    }
    return adminApp;
};

const getClient = () => {
    if (!clientApp) {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.PROJECT_ID,
            appId: process.env.APP_ID,
        };

        if (!getApps().length) {
            clientApp = initializeApp(firebaseConfig);
        }
    }
    return clientApp;
};

module.exports = { getAdmin, getClient };
