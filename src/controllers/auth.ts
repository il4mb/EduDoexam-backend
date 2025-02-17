const authRouter = require('express').Router();
import { getClient, getAdmin } from "../utils/firebase";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from 'firebase-admin/firestore';

const client: any = getClient()
const admin = getAdmin()
const auth = getAuth(client);

const validateLoginInput = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: true, message: "Please enter email and password" });
    }
    if (!/[a-z0-9.-_]+\@\w{3,}\.[a-z0-9.]{2,}/im.test(email)) {
        return res.status(400).json({ error: true, message: "Please provide a valid email address" });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: true, message: "Invalid password, please enter a minimum of 8 characters" });
    }

    next();
};

authRouter.post('/login', validateLoginInput, async (req, res, next) => {

    // 3 days
    const expiresIn = 60 * 60 * 24 * 3 * 1000;

    try {
        const { email, password } = req.body;
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = userCredential.user;
        const token = await user.getIdToken();
        const sessionCookie = await admin.auth().createSessionCookie(token, { expiresIn });

        res.cookie("__session", sessionCookie, {
            maxAge: expiresIn
        })
        res.status(200).json({
            error: false,
            message: "Login successful",
        });
    } catch (error) {

        res.status(401).json({
            error: true,
            message: "Invalid email or password"
        });
    }
});


// Register route
authRouter.post('/register', async (request, response) => {

    const { name, gender, email, password } = request.body;

    try {

        const db = getFirestore();

        /**
         * CREATE USER
         */
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        /**
         * STORE ATTRIBUTE
         */
        const docRef = db.collection('users').doc(user.uid);
        await docRef.set({ name: name, gender: gender, quota: 2, package: "trial" });

        response.status(201).json({
            error: false,
            message: "User registered successfully",
            userId: user.uid
        });

    } catch (error) {

        response.status(400).json({
            error: true,
            message: error.message
        });
    }
});

export default authRouter;
