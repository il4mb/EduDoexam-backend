import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { convertFirestoreData } from '../utils/converter';
const router = express.Router();

/**
 * Get List Questions
 */
router.get("/:examId", async (req, res, next) => {

    try {
        const examId = req.params.examId;
        if (!examId) {
            return res.status(400).json({
                error: true,
                message: "Invalid path, exam id not found in path"
            })
        }

        const db = getFirestore();
        const questionsRef = db.collection("exams").doc(examId).collection("questions");
        const questionsSnapshot = await questionsRef.get();
        if (questionsSnapshot.empty) {
            return res.status(404).json({
                error: true,
                message: "Questions doesn't exist."
            })
        }


        const listQuestions = await Promise.all(questionsSnapshot.docs.map(async (doc) => {
            const optionsRef = questionsRef.doc(doc.id).collection("options");
            const optionsSnapshot = await optionsRef.get()
            return convertFirestoreData({
                ...doc.data(),
                options: optionsSnapshot.docs.map((doc) => convertFirestoreData({
                    key: doc.id,
                    ...doc.data()
                }))
            })
        }))


        return res.status(200).json({
            error: false,
            message: "Questions fetched successfully.",
            listQuestions
        })

    } catch (error) {
        next(error);
    }
})


export default router;