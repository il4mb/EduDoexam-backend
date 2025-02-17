import express from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { userExtractor } from '@/utils/middleware';
import { convertFirestoreData } from '@/utils/converter';
import { getUserById } from '@/utils/helpers/user';
import { classParticipants, classUpdateValidator } from '@/utils/middlewares/classMiddleware';
import { sendEmail } from '@/mails/mailer';
const router = express.Router();

router.use(userExtractor);

router.get("/:classId", classParticipants, async (req, res, next) => {

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

router.post("/join/:classId", async (req, res, next) => {
    try {
        const { classId } = req.params;
        const { uid } = req.user;
        const db = getFirestore();

        // References
        const classRef = db.collection("classes").doc(classId);
        const participantsRef = classRef.collection("participants");
        const userRef = db.collection("users").doc(uid);

        // Fetch class and participant data
        const [classSnapshot, participantSnapshot, userSnapshot] = await Promise.all([
            classRef.get(),
            participantsRef.doc(uid).get(),
            userRef.get()
        ]);

        // Check if the class exists
        if (!classSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Class not found"
            });
        }

        // Check if the user has already joined
        if (participantSnapshot.exists) {
            return res.status(403).json({
                error: true,
                message: "You have already joined this class"
            });
        }

        // Ensure the user exists
        if (!userSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "User not found"
            });
        }

        // Fetch class owner data
        const { createdBy: ownerId, name: className, participants: participants = [] } = classSnapshot.data();
        const ownerRef = db.collection("users").doc(ownerId);
        const ownerSnapshot = await ownerRef.get();
        if (!ownerSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Class owner not found"
            });
        }

        participants.push(uid);
        // Update class participants
        await classRef.update({
            participants: participants.filter((value, index, self) => self.indexOf(value) === index)
        });

        // Add participant details
        await participantsRef.doc(uid).set({
            joinAt: new Date(),
            role: "student",
            description: {
                text: "join class"
            }
        });

        const user = userSnapshot.data();
        const owner = ownerSnapshot.data();

        // Send email notification to the class owner
        await sendEmail("owner.join.html", {
            uid: ownerId,
            subject: "Class Join Notification",
            owner: {
                name: owner.name
            },
            user: {
                name: user.name
            },
            class: {
                id: classId,
                name: className
            }
        });

        // Respond to the user
        return res.status(200).json({
            error: false,
            message: "Successfully joined the class"
        });
    } catch (error) {
        next(error);
    }
});


router.use("/post", require("./classes.doc.posts"));
router.use("/participants", require("./classes.doc.participants"));

export default router;