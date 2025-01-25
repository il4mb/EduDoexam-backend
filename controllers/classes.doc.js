const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const { userExtractor } = require('../utils/middleware');
const { convertFirestoreData } = require('../utils/converter');
const { getUserById } = require('../utils/helpers/user');
const { classParticipants, classUpdateValidator } = require('../utils/middlewares/classMiddleware');
const router = express.Router();

router.get("/:classId", userExtractor, classParticipants, async (req, res, next) => {

    try {

        const classData = convertFirestoreData(req.classData);
        if (Array.isArray(classData.participants)) {
            classData.participants = await Promise.all(classData.participants.map(async (uid) => await getUserById(uid)));
        }

        res.status(200).json({
            error: false,
            message: "Class data retrieved successfully",
            data: classData
        });

    } catch (error) {
        next(error);
    }
});

router.post("/:classId", classParticipants, (req, res, next) => {
    try {


    } catch (error) {
        next(error)
    }
})

router.put("/:classId", classParticipants, classUpdateValidator, async (req, res, next) => {
    try {
        const { name, label, archived } = req.body;
        const { classId } = req.params;

        const db = getFirestore();
        const classesRef = db.collection("classes").doc(classId);
        const classSnapshot = await classesRef.get();

        if (!classSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Class not found"
            })
        }

        classesRef.update({
            name,
            label,
            archived
        })
        return res.status(200).json({
            error: false,
            message: "Success update class"
        });

    } catch (error) {
        next(error)
    }
})

router.use("/post", require("./classes.doc.posts"));
router.use("/participants", require("./classes.doc.participants"));


module.exports = router;