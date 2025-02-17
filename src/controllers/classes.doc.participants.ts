import express from 'express';
const router = express.Router();
import { userExtractor } from '../utils/middleware';
import { getUserById } from '../utils/helpers/user';
import { getFirestore } from 'firebase-admin/firestore';
import { convertFirestoreData } from '../utils/converter';
import { classParticipants, classAdminParticipant } from '../utils/middlewares/classMiddleware';


/**
 * Get Class Participants
 */
router.get("/:classId", userExtractor, classParticipants, async (req, res, next) => {
    try {
        const { classId } = req.params;

        const db = getFirestore();
        const participantsSnapshot = await db
            .collection("classes")
            .doc(classId)
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
            return data
        }))

        return res.status(200).json({
            error: false,
            message: "Participants fetched successfully.",
            data: participantList,
        });

    } catch (error) {
        next(error);
    }
});

/**
 * # Admin
 * Remove participant
 */
router.delete("/:classId/:uid", userExtractor, classAdminParticipant, async (req, res, next) => {
    try {

        const { classId, uid } = req.params;
        const db = getFirestore();
        const classRef = db.collection("classes").doc(classId);
        const participansRef = classRef.collection("participants");
        const participantSnapshot = await participansRef.doc(uid).get();
        if (!participantSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Participant not found."
            })
        }
        const createdBy = (await classRef.get()).data().createdBy;
        if (uid == createdBy) {
            return res.status(403).json({
                error: true,
                message: "Can't remove who created the class"
            })
        }
        await participansRef.doc(uid).delete();

        return res.json({
            error: false,
            message: "Participant deleted successfully."
        });

    } catch (error) {
        next(error);
    }
})


export default router;