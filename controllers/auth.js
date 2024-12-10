const authRouter = require('express').Router();
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore } = require('firebase-admin/firestore');
const { FIREBASE_CONFIG } = require("../utils/config");
const firebase = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(firebase);



authRouter.post('/login', async (req, res, next) => {

    const { email, password } = req.body;

    try {

        if (!email || !password) {
            throw new Error("Please enter email and password")
        }
        if (!/[a-z0-9.-_]+\@\w{3,}\.[a-z0-9.]{2,}/im.test(email)) {
            throw new Error("Please valid email address")
        }
        if (password.length < 8) {
            throw new Error("Invalid password, please enter minimum 8 character")
        }

        console.log(email)

        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = userCredential.user;
        const token = await user.getIdToken();

        res.status(200).json({
            error: false,
            message: "Login successful",
            token: token
        });

    } catch (error) {
        next(error)
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
        await docRef.set({ name: name, gender: gender, quota: 2 });

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
