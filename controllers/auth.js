const authRouter = require('express').Router();
const { getClient } = require("../utils/firebase")
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } = require("firebase/auth");
const { getFirestore } = require('firebase-admin/firestore');

const firebase = getClient()
const auth = getAuth(firebase);

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
    const { email, password } = req.body;

    try {

        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = userCredential.user;
        const token = await user.getIdToken();

        res.status(200).json({
            error: false,
            message: "Login successful",
            token: token
        });
    } catch (error) {
        console.error("Login error:", error); // Log error for debugging
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

module.exports = authRouter;
