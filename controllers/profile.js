const profileRouters = require('express').Router();
const middleware = require('../utils/middleware');
const Multer = require('multer');
const { getFirestore } = require('firebase-admin/firestore');
const { uploadFile, getFileUrl } = require("../utils/cloudStorage")

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024
    },
});

// get user 
profileRouters.get('/', middleware.userExtractor, async (req, res) => {

    try {

        const user = req.user
        const db = getFirestore();
        const docRef = db.collection('users').doc(user.uid);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        const userData = {
            id: user.uid,
            email: user.email,
            email_verified: user.email_verified,
            ...{ ...{ name, gender } = docSnapshot.data() }
        }

        const photoUrl = await getFileUrl(`/uploads/profile/${user.uid}.jpg`);
        userData.photo = photoUrl
        const packageId = user.package || "trial"
        const packageRef = db.collection("packages").doc(packageId);
        const packageSnapshot = await packageRef.get();

   
        const packageData = {
            id: packageId,
            label: "No label",
            maxParticipant: 0,
            maxQuestion: 0,
            price: 0,
            freeQuota: 0,
            ...packageSnapshot.data()
        }

        userData.currentPackage = packageData

        res.json({
            error: false,
            message: "User fetch successful",
            user: userData
        });

    } catch (error) {
        next(error);
        console.error('Error fetching user data:', error);
        // res.status(500).json({
        //     error: true,
        //     message: 'Failed to retrieve user data'
        // });
    }
});



// update user
profileRouters.put('/', middleware.userExtractor, multer.single('photo'), async (req, res) => {

    try {

        const user = req.user;
        const uid = user.uid;
        const { name, gender } = req.body;

        // Validate inputs
        if (!name || typeof gender === 'undefined') {
            return res.status(400).json({
                error: true,
                message: 'Both name and gender are required fields.',
            });
        }

        if (![0, 1].includes(parseInt(gender))) {
            return res.status(400).json({
                error: true,
                message: 'Invalid gender. Gender should be 0 (male) or 1 (female).',
            });
        }

        if (name.trim().length <= 3) {
            return res.status(400).json({
                error: true,
                message: 'Invalid name. Name should have more than 3 characters.',
            });
        }


        if (user.uid !== uid) {
            return res.status(403).json({
                error: true,
                message: 'Unauthorized to update this user.',
            });
        }

        const db = getFirestore();
        const docRef = db.collection('users').doc(user.uid);

        // Update user details
        await docRef.update({ name: name, gender: gender });

        const userData = {
            id: user.uid,
            email: user.email,
            email_verified: user.email_verified,
            name,
            gender
        }

        if (req.file) {
            const fileUrl = await uploadFile(req.file, `/uploads/profile/${docRef.id}.jpg`)
            userData.photo = fileUrl
        } else (
            userData.photo = await getFileUrl(`/uploads/profile/${docRef.id}.jpg`)
        )

        // Ensure that res is only sent once
        if (!res.headersSent) {
            res.status(200).json({
                error: false,
                message: 'User updated successfully.',
                user: userData,
            });
        }

    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({
            error: true,
            message: 'Failed to update user. Please try again later.',
        });
    }
});

module.exports = profileRouters;
