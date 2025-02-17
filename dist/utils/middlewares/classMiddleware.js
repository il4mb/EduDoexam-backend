import { getFirestore } from "firebase-admin/firestore";
export const classParticipants = async (req, res, next) => {
    try {
        const { uid } = req.user;
        const { classId } = req.params;
        if (!uid) {
            return res.status(400).json({
                error: true,
                message: "Invalid user authentication"
            });
        }
        if (!classId) {
            return res.status(400).json({
                error: true,
                message: "Invalid class id"
            });
        }
        const db = getFirestore();
        const classRef = db.collection("classes").doc(classId);
        const classDoc = await classRef.get();
        if (!classDoc.exists) {
            return res.status(404).json({
                error: true,
                message: "Class not found or you are not a participant of this class"
            });
        }
        const classData = classDoc.data();
        if (!classData.participants || !classData.participants.includes(uid)) {
            return res.status(403).json({
                error: true,
                message: "You are not a participant of this class"
            });
        }
        req.classData = classData;
        next();
    }
    catch (error) {
        console.error("Error in classParticipants middleware:", error);
        next(error);
    }
};
export const classUpdateValidator = (req, res, next) => {
    const { name, label, archived, archivedConfirm } = req.body;
    const { classId } = req.params;
    if (classId == null) {
        return res.status(400).json({
            error: true,
            message: "Invalid class id"
        });
    }
    if (!name || name.length < 5) {
        return res.status(400).json({
            error: true,
            message: "Invalid name, please enter minimum 5 character"
        });
    }
    if (!label || label.length < 5) {
        return res.status(400).json({
            error: true,
            message: "Invalid label, please enter minimum 5 character"
        });
    }
    if (archived && archivedConfirm != classId) {
        return res.status(400).json({
            error: true,
            message: "Invalid archived confirm"
        });
    }
    next();
};
export const classAdminParticipant = async (req, res, next) => {
    try {
        const { uid } = req.user;
        const { classId } = req.params;
        const db = getFirestore();
        const classRef = db.collection("classes").doc(classId);
        const participantRef = classRef.collection("participants").doc(uid);
        const participantSnapshot = await participantRef.get();
        if (!participantSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Class not found or you are not a participant of this class"
            });
        }
        const createdBy = (await classRef.get())?.data()?.createdBy;
        const participant = participantSnapshot.data();
        if (!["admin", "owner"].includes(participant?.role) && uid !== createdBy) {
            return res.status(403).json({
                error: true,
                message: "You have no authority"
            });
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
module.exports = {
    classParticipants,
    classAdminParticipant,
    classUpdateValidator
};
