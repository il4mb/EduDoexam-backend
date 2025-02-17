import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { convertFirestoreData } from '../utils/converter';
import { examParticipant, examAdminParticipant, userExtractor } from '../utils/middleware';
const router = express.Router();

/**
 * Get Answers by participant
 * Query
 * - uid: only for admin, get user answers if null will get uid from current user in session
 */
router.get("/:examId", userExtractor, examParticipant, async (req, res, next) => {

    try {

        const { examId } = req.params;
        const { uid } = req.query.uid ? req.query : req.user;

        if (!examId) {
            return res.status(400).json({
                error: true,
                message: "Invalid path, exam id not found in path"
            })
        }

        const db = getFirestore();
        const answersRef = db.collection("exams").doc(examId).collection("participants").doc(uid);
        const answersSnapshot = await answersRef.get();
        if (!answersSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Answers doesn't exist."
            })
        }

        const listanswers = await convertFirestoreData(answersSnapshot.data())
        return res.status(200).json({
            error: false,
            message: "answers fetched successfully.",
            listanswers
        })

    } catch (error) {
        next(error);
    }
})


router.post("/:examId", userExtractor, examParticipant, async (req, res, next) => {

    try {

        const { examId } = req.params;
        const { uid } = req.user;

        const db = getFirestore();

        const answersRef = db.collection("exams").doc(examId).collection("answers");
        const answersSnapshot = await answersRef.doc(uid).get();
        if (answersSnapshot.exists) {
            return res.status(403).json({
                error: false,
                message: "Answers already submited!"
            })
        }
        const answers = [];
        const fields = {
            createdAt: new Date(),
            answers,
            expressions: []
        }

        await answersRef.doc(uid).set(fields);


        const participansRef = db.collection("exams").doc(examId).collection("participants").doc(uid);
        await participansRef.update({
            answersRef: db.doc(`exams/${examId}/answers/${uid}`)
        })

        return res.status(200).json({
            error: false,
            message: "Answers submited successfully."
        })


    } catch (error) {
        next(error);
    }
})

export default router;