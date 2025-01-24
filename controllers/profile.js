const profileRouters = require('express').Router();
const middleware = require('../utils/middleware');
const Multer = require('multer');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { uploadFile, getFileUrl } = require("../utils/cloudStorage")

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024
    },
});

// get user 
profileRouters.get('/', middleware.userExtractor, async (req, res, next) => {

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
        const myPackage = {
            id: packageId,
            label: "No label",
            maxParticipant: 0,
            maxQuestion: 0,
            price: 0,
            freeQuota: 0,
            ...packageSnapshot.data()
        }

        const examsRef = db.collection("exams");
        const querySnapshot = await examsRef
            .where("users", "array-contains", user.uid)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();
        const myExams = querySnapshot.docs.map(doc => {
            const exam = {
                id: doc.id,
                ...doc.data()
            };
            const filteredExam = Object.fromEntries(
                Object.entries(exam).map(([key, value]) => [
                    key,
                    value instanceof Timestamp ? value.toDate() : value
                ]).filter(([key]) =>
                    ["id", "title", "subTitle", "startAt", "finishAt", "createdAt", "createdBy"].includes(key)
                )
            );

            return filteredExam;
        });

        res.json({
            error: false,
            message: "User fetch successful",
            data: {
                user: userData,
                myPackage,
                myExams
            }
        });

    } catch (error) {
        next(error);
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
