const express = require('express');
const router = express.Router();
const { examOwner, userExtractor, examAdminParticipant } = require('../utils/middleware');
const { getUserById } = require('../utils/helpers/user');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { convertFirestoreData } = require('../utils/converter');


/**
 * Get Exam
 */
router.get("/:examId", async (req, res, next) => {

    try {

        const examId = req.params.examId
        if (!examId) {
            return res.status(400).json({
                error: true,
                message: "Invalid path, exam id not found in path"
            })
        }

        const db = getFirestore();
        const docRef = db.collection("exams").doc(examId);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Exam doesn't exist."
            })
        }

        const examFields = Object.fromEntries(
            Object.entries({
                id: docSnapshot.id,
                ...docSnapshot.data()
            }).map(([key, value]) =>
                [key, value instanceof Timestamp ? value.toDate() : value]
            ).filter(([key]) =>
                ["id", "title", "subTitle", "startAt", "finishAt", "createdAt", "createdBy", "users"].includes(key)
            )
        );

        return res.status(200).json({
            error: false,
            message: "Exam fetched successfully.",
            data: examFields
        })


    } catch (error) {
        next(error);
    }
})


/**
 * Update Exam
 */
router.put("/:examId", userExtractor, examAdminParticipant, async (req, res, next) => {
    try {
        const { examId } = req.params;
        const { title, subTitle, startAt, finishAt } = req.body;
        if (!title || !subTitle) {
            return res.status(400).json({
                error: true,
                message: 'Title and subTitle are required.'
            })
        }

        const db = getFirestore();
        const docRef = db.collection("exams").doc(examId);
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: 'Exam not found.'
            })
        }

        docRef.update({ title, subTitle, startAt: new Date(startAt), finishAt: new Date(finishAt) })

        return res.status(200).json({
            error: false,
            message: "Exam updated successfully."
        })

    } catch (error) {
        next(error);
    }
})


/**
 * Delete Exam
 */
router.delete("/:examId", userExtractor, examAdminParticipant, async (req, res, next) => {

    try {

        const { examId } = req.params;
        if (!examId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid path, exam id not found in path'
            })
        }

        const db = getFirestore()
        const docRef = db.collection("exams").doc(examId);
        await docRef.delete();

        return res.status(200).json({
            error: false,
            message: "Exam deleted successfully."
        })

    } catch (error) {
        next(error);
    }
})


/**
 * Create New Exam
 */
router.post("/", userExtractor, async (req, res, next) => {
    const db = getFirestore();
    const { uid } = req.user;
    const { title, subTitle, startAt, finishAt } = req.body;

    try {
        // Validate input
        if (!title || !subTitle || !startAt || !finishAt) {
            return res.status(400).json({
                error: true,
                message: "All fields are required",
            });
        }
        const startAtDate = new Date(startAt);
        const finishAtDate = new Date(finishAt);

        if (isNaN(startAtDate) || isNaN(finishAtDate)) {
            return res.status(400).json({
                error: true,
                message: "Invalid date format",
            });
        }

        if (startAtDate >= finishAtDate) {
            return res.status(400).json({
                error: true,
                message: "Start time must be before finish time",
            });
        }

        const examsRef = db.collection("exams");
        const newExamRef = examsRef.doc();

        // Create a transaction
        await db.runTransaction(async (transaction) => {

            const metaExam = {
                title,
                subTitle,
                startAt: startAtDate,
                finishAt: finishAtDate,
                createdAt: new Date(),
                createdBy: uid,
            };

            // Create exam document
            transaction.set(newExamRef, metaExam);

            // Add user to the exam
            const userRef = newExamRef.collection("participants").doc(uid);
            transaction.set(userRef, {
                joinAt: new Date(),
                joinDescription: "create",
                role: "owner",
                isBlocked: false
            });

            // Add initial questions collection
            const questionsRef = newExamRef.collection("questions").doc();
            transaction.set(questionsRef, {
                createdAt: new Date(),
                createdBy: uid,
                description: "this is initial question"
            });

            // Add initial option to question
            const optionsRef = questionsRef.collection("options").doc("A");
            transaction.set(optionsRef, {
                description: "Option 1",
                isCorrect: false
            });
        });

        // Respond with success
        return res.status(201).json({
            error: false,
            message: "Exam created successfully",
            data: { examId: newExamRef.id }, // Use newExamRef.id to get the ID of the created exam
        });
    } catch (error) {
        next(error)
    }
});

/**
 * Join to Exam
 */
router.post("/join/:examId", userExtractor, async (req, res, next) => {

    try {

        const { examId } = req.params;
        const { uid } = req.user;
        if (!uid) {
            return res.status(401).json({
                error: true,
                message: "User is missing"
            })
        }

        const db = getFirestore();
        const docRef = db.collection("exams").doc(examId);
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Exam doesn't exist."
            })
        }

        const examData = docSnapshot.data()
        if (examData.finishAt.toDate() <= new Date()) {
            return res.status(400).json({
                error: true,
                message: "Unable to join, Exam has finished."
            })
        }
        const blockedList = examData.blocked || []
        if (blockedList.includes(uid)) {
            return res.status(400).json({
                error: true,
                message: 'You has been blocked.'
            })
        }

        const users = examData.users
        if (users.includes(uid)) {
            return res.status(400).json({
                error: true,
                message: 'You is already a participant.'
            })
        }

        users.push(uid)
        docRef.update({ users: users })

        return res.status(200).json({
            error: false,
            message: "Join successfully."
        })

    } catch (error) {
        next(error);
    }
})

module.exports = router;