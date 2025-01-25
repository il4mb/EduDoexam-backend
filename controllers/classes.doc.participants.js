const express = require('express');
const router = express.Router();
const { userExtractor, examAdminParticipant } = require('../utils/middleware');
const { getUserById } = require('../utils/helpers/user');
const { getFirestore } = require('firebase-admin/firestore');
const { convertFirestoreData } = require('../utils/converter');

/**
 * # Owner
 * Get Exam Participants
 */
router.get("/:examId", userExtractor, examAdminParticipant, async (req, res, next) => {
    try {
        const { examId } = req.params;
        if (!examId) {
            return res.status(400).json({
                error: true,
                message: "Invalid path, exam id not found in path"
            });
        }

        const db = getFirestore();
        const participantsSnapshot = await db
            .collection("exams")
            .doc(examId)
            .collection("participants")
            .get();

        if (participantsSnapshot.empty) {
            return res.status(404).json({
                error: true,
                message: "No participants found."
            });
        }

        const participantList = await Promise.all(participantsSnapshot.docs.map(async (doc) => {
            const data = convertFirestoreData({
                user: await getUserById(doc.id),
                ...doc.data()
            })
            const answersRef = db.collection("exams").doc(examId).collection("answers").doc(doc.id);
            const answersSnapshot = await answersRef.get();
            data.hasAnswer = answersSnapshot.exists
            return data
        }))

        return res.status(200).json({
            error: false,
            message: "Exam fetched successfully.",
            data: participantList,
        });

    } catch (error) {
        next(error);
    }
});


/**
 * # Admin
 * Add participant
 * Body
 * - uid: user id
 * - role: role user in this exam [student, admin, owner] default student
 */
router.post("/:examId", userExtractor, examAdminParticipant, async (req, res, next) => {
    try {
        const { examId } = req.params;
        const { uid, role = "student" } = req.body;

        if (!uid || uid == "") {
            return res.status(400).json({
                error: true,
                message: "UID is missing!"
            })
        }

        if (role && !["student", "admin", "owner"].includes(role)) {
            return res.status(400).json({
                error: true,
                message: "Role is invalid!"
            })
        }

        if (!examId) {
            return res.status(400).json({
                error: true,
                message: "Invalid path, exam id not found in path"
            });
        }

        const db = getFirestore();

        const participantsRef = db.collection("exams").doc(examId).collection("participants");
        const participantsSnapshot = await participantsRef.doc(uid).get();
        if (participantsSnapshot.exists) {
            return res.status(400).json({
                error: true,
                message: "Participant already exists."
            });
        }


        const userRef = db.collection("users").doc(uid);
        const userSnapshot = await userRef.get();
        if (!userSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "User not found."
            });
        }


        const participant = {
            isBlocked: false,
            joinAt: new Date(),
            role: role,
            description: {
                method: "invation",
                actor: req.user.uid
            }
        }
        await participantsRef.doc(uid).set(participant)

        return res.status(200).json({
            error: false,
            message: "Exam fetched successfully.",
            data: {
                participant: participant
            },
        });

    } catch (error) {
        next(error);
    }
});

/**
 * # Admin
 * Update participant
 * Body
 * - alias: user alias
 * - blocked: true to block user
 * - role: user role default student
 */
router.put("/:examId/:uid", userExtractor, examAdminParticipant, async (req, res, next) => {
    try {
        const { examId, uid } = req.params;
        const { alias, blocked, role = "student" } = req.body;

        // Validate UID
        if (!uid || uid.trim() === "") {
            return res.status(400).json({
                error: true,
                message: "UID is missing!"
            });
        }

        // Validate Role
        if (role && !["student", "admin", "owner"].includes(role)) {
            return res.status(400).json({
                error: true,
                message: "Role is invalid!"
            });
        }

        const db = getFirestore();
        const participantsRef = db.collection("exams").doc(examId).collection("participants");
        const participantDoc = participantsRef.doc(uid);
        const participantSnapshot = await participantDoc.get();

        // Check if participant exists
        if (!participantSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Participant not found."
            });
        }

        // Check if the user is the exam creator
        const examDoc = await db.collection("exams").doc(examId).get();
        const examData = examDoc.data();
        if (examData?.createdBy === uid) {
            return res.status(403).json({
                error: true,
                message: "Can't update the user who created the exam."
            });
        }

        await participantDoc.update({
            alias: typeof alias === "string" ? alias : participantSnapshot.data().alias,
            isBlocked: blocked === true,
            role: role
        });

        return res.status(200).json({
            error: false,
            message: "Participant updated successfully."
        });
    } catch (error) {
        next(error);
    }
});

/**
 * # Admin
 * Remove participant from user
 */
router.delete("/:examId/:uid", userExtractor, examAdminParticipant, async (req, res, next) => {

    try {

        const { examId, uid } = req.params;
        const db = getFirestore();
        const participansRef = db.collection("exams").doc(examId).collection("participants");
        const participantDoc = await participansRef.doc(uid).get();

        if (!participantDoc.exists) {
            return res.status(404).json({
                error: true,
                message: "Participant not found."
            });
        }
        const examDoc = await db.collection("exams").doc(examId).get();
        const examData = examDoc.data();
        if (examData.createdBy === uid) {
            return res.status(403).json({
                error: true,
                message: "Can't remove who created the exam"
            })
        }
        await participansRef.doc(uid).delete();

        return res.status(200).json({
            error: false,
            message: "Participant deleted successfully."
        });

    } catch (error) {
        next(error);
    }
})

module.exports = router;