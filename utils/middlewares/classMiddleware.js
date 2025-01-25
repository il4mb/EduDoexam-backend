const { getFirestore } = require("firebase-admin/firestore");

const classParticipants = async (req, res, next) => {
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
    } catch (error) {
        console.error("Error in classParticipants middleware:", error);
        next(error);
    }
};

const classUpdateValidator = (req, res, next) => {
    const { name, label, archived, archivedConfirm } = req.body;
    const { classId } = req.params;

    if (classId == null) {
        return res.status(400).json({
            error: true,
            message: "Invalid class id"
        })
    }

    if (!name || name.length < 5) {
        return res.status(400).json({
            error: true,
            message: "Invalid name, please enter minimum 5 character"
        })
    }

    if (!label || label.length < 5) {
        return res.status(400).json({
            error: true,
            message: "Invalid label, please enter minimum 5 character"
        })
    }

    if (archived && archivedConfirm != classId) {
        return res.status(400).json({
            error: true,
            message: "Invalid archived confirm"
        })
    }

    next();
};

module.exports = {
    classParticipants,
    classUpdateValidator
}