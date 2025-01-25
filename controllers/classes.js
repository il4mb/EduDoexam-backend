const express = require('express');
const { userExtractor } = require('../utils/middleware');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { convertFirestoreData } = require('../utils/converter');
const { getUserById } = require('../utils/helpers/user');
const { generateId } = require('../utils/util');


router.get("/", userExtractor, async (req, res, next) => {
    try {
        const { uid } = req.user;

        if (!uid) {
            return res.status(400).json({
                error: true,
                message: "Invalid user authentication.",
            });
        }

        const db = getFirestore();
        const classesRef = db.collection("classes");

        // Create a query to filter based on participants (array-contains filter)
        const classesQuery = classesRef.where("participants", "array-contains", uid);
        const snapshot = await classesQuery.get();
        const totalCount = snapshot.size;

        // Limit the number of documents (Example: 10)
        const limitedClassesQuery = classesQuery.limit(1);
        const limitedSnapshot = await limitedClassesQuery.get();

        // Process the limited result
        const classList = await Promise.all(
            limitedSnapshot.docs.map(async (doc) => {
                const classObj = convertFirestoreData(
                    {
                        id: doc.id,
                        ...doc.data(),
                    },
                    ["id", "name", "label", "createdAt", "createdBy", "participants"]
                );

                // Resolve createdBy user details
                if (classObj.createdBy) {
                    classObj.createdBy = await getUserById(classObj.createdBy);
                }

                // Resolve participants details
                if (Array.isArray(classObj.participants)) {
                    classObj.participants = {
                        total: classObj.participants.length,
                        rows: await Promise.all(
                            classObj.participants
                                .filter((uid) => uid !== classObj.createdBy?.id) // Exclude createdBy
                                .slice(0, 5) // Limit to 5 participants
                                .map((uid) => getUserById(uid))
                        ),
                    };
                }

                return classObj;
            })
        );

        // Send the response with the total count and the limited data
        return res.status(200).json({
            error: false,
            message: "Success fetching classes",
            data: classList,
            total: totalCount, // Total count without the limit
        });
    } catch (error) {
        console.error("Error fetching classes:", error.message);
        next(error);
    }
});


router.post("/", userExtractor, async (req, res, next) => {
    try {
        const { name, label } = req.body;

        if (!name || name.length < 1) {
            return res.status(400).json({
                error: true,
                message: "Invalid name"
            })
        }
        if (!label || label.length < 5) {
            return res.status(400).json({
                error: true,
                message: "Invalid label, please enter minimum 5 character"
            })
        }

        const { uid } = req.user;

        const db = getFirestore();
        const classesRef = db.collection("classes");
        const size = await classesRef.get();
        const length = size.size;

        const uuid = generateId(length + 50);
        await classesRef.doc(uuid).set({
            name,
            label,
            createdAt: new Date(),
            createdBy: uid,
            participants: [uid]
        })
        const participantsRef = classesRef.doc(uuid).collection("participants");

        await participantsRef.doc(uid).set({
            joinAt: new Date(),
            description: {
                method: "create",
                actor: uid
            },
            role: "owner"
        })

        return res.status(200).json({
            error: false,
            message: "Success create class"
        });


    } catch (error) {
        next(error);
    }
})


router.use("/doc", require("./classes.doc"));

module.exports = router