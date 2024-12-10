const fs = require('fs');
const path = require('path');
const express = require("express");
const Multer = require('multer');
const middleware = require('../utils/middleware');
const { getFirestore, Filter } = require('firebase-admin/firestore');
const { uploadFile, getFileUrl } = require("../utils/cloudStorage")
// Instantiate a express route
const router = express.Router();

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024
    },
});


const getQuestionImage = (questionId, req) => {
    const imagePath = path.join(__dirname, '/../uploads', `${questionId}.jpg`);
    const fileExists = fs.existsSync(imagePath);
    const host = req.get('host');
    const port = req.get('port');
    if (fileExists) return `http://${host}${port?.length ? `:${port}` : ''}/uploads/${questionId}.jpg`;
    return null;
}
const getQuestions = async (examId, req) => {
    const db = getFirestore();
    const questionsRef = db.collection("questions");
    const querySnapshot = await questionsRef.where("examId", "==", examId).get();

    if (querySnapshot.empty) {
        return []
    }

    const questionsPromises = querySnapshot.docs.map(async doc => {
        let image = getQuestionImage(doc.id, req)
        return {
            id: doc.id,
            image: image,
            ...doc.data()
        }
    });

    const questions = await Promise.all(questionsPromises);
    questions.sort((a, b) => a.order - b.order);
    return questions
}
const getUserData = async (uid) => {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData
}
const formatExam = async (docRef, uid) => {
    const currentDate = new Date();
    const data = docRef.data();
    const startAt = data.startAt.toDate();
    const finishAt = data.finishAt.toDate();
    const isOnGoing = startAt <= currentDate && finishAt >= currentDate;
    let answer = null;  // Initialize as null to handle cases when no answer is found

    if (isOnGoing || finishAt < currentDate) {
        const db = getFirestore();
        const answerQuery = await db.collection("answers")
            .where("examId", "==", docRef.id)
            .where("userId", "==", uid)
            .limit(1)
            .get();

        if (!answerQuery.empty) {

            answer = answerQuery.docs.map(doc => doc.data())[0];
            answer.createdAt = answer.createdAt.toDate();
            answer.data = answer.data.map(d => {
                if (d.summary) {
                    d.summary = JSON.stringify(d.summary);
                }
                return d;
            });
        }
    }

    return {
        id: docRef.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        startAt: startAt,
        finishAt: finishAt,
        isOwner: uid && uid === data.createdBy,
        isOngoing: isOnGoing,
        answer: answer
    };
}
const formatExams = async (docs = [], uid = null) => {

    // Use Promise.all to wait for all async operations to complete
    const formattedExams = await Promise.all(docs.map(async (doc) => {
        return await formatExam(doc, uid);
    }));

    return formattedExams.map(exam => {
        exam.isAnswered = exam.answer != null
        delete exam.answer
        delete exam.blocked
        delete exam.users
        return exam;
    });
};



router.get("/upcoming", middleware.userExtractor, async (req, res, next) => {

    try {

        const db = getFirestore();
        const uid = req.user.uid;
        const tableRef = db.collection("exams");

        const currentDate = new Date();
        const oneWeekLatter = new Date();
        oneWeekLatter.setDate(currentDate.getDate() + 7);


        const querySnapshot = await tableRef
            .where("users", "array-contains", uid)
            .where("startAt", ">", currentDate)
            .where("startAt", "<", oneWeekLatter)
            .orderBy("startAt", "desc")
            .get();

        if (querySnapshot.empty) {
            return res.status(404).json({ message: "No upcoming exams found." });
        }

        const exams = await formatExams(querySnapshot.docs, uid);

        res.json({
            error: false,
            exams: exams
        });

    } catch (error) {
        next(error);
    }
});

router.get("/ongoing", middleware.userExtractor, async (req, res, next) => {
    try {
        const db = getFirestore();
        const uid = req.user.uid; // Extract user ID
        const tableRef = db.collection("exams");
        const now = new Date();

        const queryRef = await tableRef
            .where("users", "array-contains", uid)
            .where("startAt", "<=", now)
            .where("finishAt", ">", now)
            .orderBy("finishAt", "desc")
            .limit(10)
            .get();

        const docs = queryRef.docs

        // Check if there are no matching documents
        if (docs.length === 0) {
            console.log("No matching documents.");
            return res.status(404).json({
                error: true,
                message: "No ongoing exams found."
            });
        }

        // Format the fetched exams
        const exams = await formatExams(docs, uid);

        console.log(exams)

        res.json({
            error: false,
            exams: exams,
        });
    } catch (error) {
        console.error("Error fetching ongoing exams:", error.message);
        next(error);
    }
});

router.get("/finished", middleware.userExtractor, async (req, res, next) => {

    try {

        const db = getFirestore();
        const uid = req.user.uid;
        const tableRef = db.collection("exams");

        const now = new Date();
        const querySnapshot = await tableRef
            .where(
                Filter.or(
                    Filter.where("users", "array-contains", uid),
                    Filter.where("createdBy", "==", uid)
                )
            )
            .where("finishAt", "<", now)
            .orderBy("finishAt", "desc")
            .get();

        if (querySnapshot.empty) {
            console.log("No matching documents.");
            return res.status(404).json({
                error: true,
                message: "No finished exams found."
            });
        }

        const exams = await formatExams(querySnapshot.docs, uid);
        console.log(exams);

        res.json({
            error: false,
            exams: exams
        });

    } catch (error) {
        next(error);
    }
});

router.get("/", middleware.userExtractor, async (req, res, next) => {
    try {

        const db = getFirestore();
        const uid = req.user.uid;
        const tableRef = db.collection("exams");
        const now = new Date(); // Proper Date object

        const querySnapshot = await tableRef
            .where("users", "array-contains", uid)
            .where("finishAt", ">", now)
            .orderBy("createdAt", "desc")
            .get();

        const exams = await formatExams(querySnapshot.docs, uid);

        if (exams.length === 0) {
            return res.status(404).json({ message: "No exams found." });
        }

        console.log(exams)

        res.json({
            error: false,
            message: "success",
            exams: exams,
        });
    } catch (error) {
        next(error);
    }
});

router.post("/", middleware.userExtractor, async (req, res, next) => {

    try {

        const db = getFirestore();
        const tableRef = db.collection("exams");

        const { title, subTitle, startAt, finishAt, users } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: true, message: "Title is required." });
        }
        if (!subTitle) {
            return res.status(400).json({ error: true, message: "SubTitle is required." });
        }
        if (!startAt) {
            return res.status(400).json({ error: true, message: "Start time is required." });
        }
        if (!finishAt) {
            return res.status(400).json({ error: true, message: "Finish time is required." });
        }

        const user = req.user;
        if (!user || !user.uid) {
            return res.status(401).json({
                error: true,
                message: "Unauthorized: User not authenticated.",
            });
        }
        const uid = user.uid

        // Parse and validate dates
        const startDate = new Date(startAt);
        const finishDate = new Date(finishAt);

        if (isNaN(startDate.getTime())) {
            return res.status(400).json({
                error: true,
                message: "Invalid startAt date format.",
            });
        }

        if (isNaN(finishDate.getTime())) {
            return res.status(400).json({
                error: true,
                message: "Invalid finishAt date format.",
            });
        }

        // Construct the new object
        const newEntry = {
            title,
            subTitle,
            startAt: startDate,
            finishAt: finishDate,
            blocked: [], // Default value
            createdAt: new Date(), // Current timestamp
            createdBy: uid, // Use authenticated user's uid
            users: [...(Array.isArray(users) ? users : []), uid], // Ensure it's an array
        };

        // Add the entry to Firestore
        const savedEntry = await tableRef.add(newEntry);

        // Respond with success
        res.status(201).json({
            error: false,
            message: "Exam created successfully.",
            id: savedEntry.id, // Include Firestore-generated ID
        });
    } catch (error) {
        console.error("Error creating exam:", error.message);
        res.status(500).json({
            error: true,
            message: "Internal Server Error. Could not create the exam.",
        });
    }
});


router.use("/:examId", middleware.userExtractor, (req, res, next) => {

    const examId = req.params.examId
    const examRoute = express.Router();

    if (!examId) {
        return res.status(400).json({
            error: true,
            message: "Invalid path, exam id not found in path"
        })
    }

    // Middleware to check if the user is the owner of the exam
    const examOwner = async (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'User is missing'
            });
        }

        try {

            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);

            // Fetch the exam document
            const examDoc = await examRef.get();

            // If the exam doesn't exist
            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found'
                });
            }


            const examData = examDoc.data();
            if (examData.createdBy !== user.uid) {
                return res.status(403).json({
                    error: true,
                    message: 'You are not the owner of this exam'
                });
            }

            next();

        } catch (err) {
            return next(err);
        }
    };

    const examStudent = async (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: true,
                message: "User is missing"
            });
        }

        try {
            const db = getFirestore();
            const examRef = db.collection("exams");

            // Check if the user is part of any exam
            const querySnapshot = await examRef
                .where("users", "array-contains", user.uid)
                .limit(1) // Optimize by limiting results to 1
                .get();

            // If no documents are found
            if (querySnapshot.empty) {
                return res.status(404).json({
                    error: true,
                    message: "Exam not found or you are no longer a participant"
                });
            }

            next(); // Proceed to the next middleware or route handler
        } catch (err) {
            next(err);
        }
    };

    const getExam = async (id) => {

        const db = getFirestore();
        const docRef = db.collection("exams").doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return null
        }
        return await formatExam(docSnapshot, req.user.uid)
    }

    examRoute.post("/join", async () => {
        try {
            const { uid } = req.user
            const db = getFirestore();
            const docRef = db.collection("exams").doc(examId);
            const docSnapshot = await docRef.get();

            if (!docSnapshot.exists) {
                return res.status(404).json({
                    error: true,
                    message: "Exam doesn't exist.",
                });
            }
            const examData = docSnapshot.data()

            const blockedUsers = examData.blocked || []
            if (blockedUsers.includes(uid)) {
                return res.status(400).json({
                    error: true,
                    message: 'You has been blocked.',
                });
            }

            const examUsers = examData.users || []
            if (examUsers.includes(uid)) {
                return res.status(400).json({
                    error: true,
                    message: 'You is already a participant.',
                });
            }

            await docRef.update({ users: [...examUsers, uid] })

            res.status(200).json({
                error: false,
                message: "Join successfully."
            });
        } catch (error) {
            console.error("Error fetching exam:", error);
            res.status(500).json({
                status: "error",
                error: true,
                message: "Failed to fetch exam. Please try again later.",
            });
        }
    })


    // get examBy id 
    examRoute.get("/", async (req, res) => {

        try {
            const exam = await getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    error: true,
                    message: "Exam doesn't exist.",
                });
            }

            delete exam.blocked
            delete exam.answers
            delete exam.users
            console.log(exam)

            res.status(200).json({
                error: false,
                message: "Exam fetched successfully.",
                exam: exam
            });
        } catch (error) {
            console.error("Error fetching exam:", error);
            res.status(500).json({
                status: "error",
                error: true,
                message: "Failed to fetch exam. Please try again later.",
            });
        }
    });




    examRoute.get("/detail", async (req, res) => {

        try {
            const exam = await getExam(examId)

            if (!exam) {
                return res.status(404).json({
                    error: true,
                    message: "Exam doesn't exist.",
                });
            }

            delete exam.blocked
            delete exam.answers
            delete exam.users
            console.log(exam)

            res.status(200).json({
                error: false,
                message: "Exam fetched successfully.",
                exam: exam
            });
        } catch (error) {
            console.error("Error fetching exam:", error);
            res.status(500).json({
                status: "error",
                error: true,
                message: "Failed to fetch exam. Please try again later.",
            });
        }
    });

    // get examBy id 
    examRoute.get("/student/result", examStudent, async (req, res) => {

        try {

            const { uid, email } = req.user
            const userData = await getUserData(uid);
            const exam = await getExam(examId)
            const questions = await getQuestions(examId, req)

            if (!exam) {
                return res.status(404).json({
                    error: true,
                    message: "Exam doesn't exist.",
                });
            }

            delete exam.blocked
            delete exam.users

            const photoUrl = await getFileUrl(`/uploads/profile/${uid}.jpg`);
            exam.user = {
                uid: uid,
                email: email,
                ...userData,
                photo: photoUrl
            }
            exam.questions = questions

            console.log(exam)

            res.status(200).json({
                error: false,
                message: "Exam fetched successfully.",
                result: exam
            });
        } catch (error) {
            console.error("Error fetching exam:", error);
            res.status(500).json({
                status: "error",
                error: true,
                message: "Failed to fetch exam. Please try again later.",
            });
        }
    });

    // get examBy id 
    examRoute.get("/teacher/result", examOwner, async (req, res) => {

        try {
            const admin = require('firebase-admin');
            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);
            const examDoc = await examRef.get();

            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found'
                });
            }

            const examData = examDoc.data();
            const students = examData["users"] || [];
            const userPromises = students.map(async (userId) => {
                try {
                    const userRecord = await admin.auth().getUser(userId);
                    const userDoc = await db.collection('users').doc(userId).get();
                    const userData = userDoc.data();
                    if (userRecord.uid == examData.createdBy) return null;
                    const photoUrl = await getFileUrl(`/uploads/profile/${userRecord.uid}.jpg`);

                    return {
                        id: userRecord.uid,
                        email: userRecord.email,
                        name: userData ? userData.name : null,
                        gender: userData ? userData.gender : null,
                        photo: photoUrl
                    };
                } catch (error) {
                    console.error(`Error fetching user data for ${userId}:`, error);
                    return null;
                }
            });
            const userDetails = await Promise.all(userPromises);
            const validUsers = userDetails.filter(user => user !== null);

            const questions = await getQuestions(examId, req)

            const answerQuery = await db.collection("answers").where("examId", "==", examId).get();
            var answers = [];
            if (!answerQuery.empty) {

                answers = answerQuery.docs.map(doc => doc.data()).map(answer => {
                    answer.createdAt = answer.createdAt.toDate();
                    answer.data = answer.data.map(d => {
                        if (d.summary) {
                            d.summary = JSON.stringify(d.summary);
                        }
                        return d;
                    });
                    return answer;
                })
            }

            examData.users = validUsers;
            examData.answers = answers;
            examData.questions = questions;
            examData.createdAt = examData.createdAt.toDate();
            examData.startAt = examData.startAt.toDate();
            examData.finishAt = examData.finishAt.toDate();

            console.log(examData)

            res.json({
                error: false,
                message: "success",
                result: examData
            });

        } catch (error) {
            next(error);
        }
    });

    // update exam
    examRoute.put("/", examOwner, async (req, res, next) => {

        try {

            const { title, subTitle, startAt, finishAt } = req.body;

            console.log(req.body)

            // Input validation
            if (!title || !subTitle) {
                return res.status(400).json({
                    error: true,
                    message: 'Title and subTitle are required.',
                });
            }

            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);
            const examDoc = await examRef.get();

            // Check if the exam exists
            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found.',
                });
            }

            // Update the exam document
            await examRef.update({ title, subTitle, startAt: new Date(startAt), finishAt: new Date(finishAt) });

            // Send the updated data back in the response
            res.status(200).json({
                error: false,
                message: "Exam updated successfully."
            });
        } catch (error) {
            // Error handling
            console.error("Error updating exam:", error);
            next(error);
        }
    });

    // get users
    examRoute.get("/students", examOwner, async (req, res, next) => {
        try {
            const admin = require('firebase-admin');
            const { block } = req.query
            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);
            const examDoc = await examRef.get();

            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found'
                });
            }

            const blockBool = block === 'true';

            const examData = examDoc.data();
            const students = examData[blockBool ? "blocked" : "users"] || [];

            const userPromises = students.map(async (userId) => {

                try {

                    const userRecord = await admin.auth().getUser(userId);
                    const userDoc = await db.collection('users').doc(userId).get();
                    const userData = userDoc.data();
                    if (userRecord.uid == examData.createdBy) return null;
                    const photoUrl = await getFileUrl(`/uploads/profile/${userRecord.uid}.jpg`);

                    return {
                        id: userRecord.uid,
                        email: userRecord.email,
                        name: userData ? userData.name : null,
                        gender: userData ? userData.gender : null,
                        photo: photoUrl
                    };
                } catch (error) {
                    console.error(`Error fetching user data for ${userId}:`, error);
                    return null;
                }
            });

            const userDetails = await Promise.all(userPromises);
            const validUsers = userDetails.filter(user => user !== null);

            res.json({
                error: false,
                message: "success",
                users: validUsers
            });

        } catch (error) {
            next(error);
        }
    });

    // Add user/student to exam
    examRoute.post("/students", examOwner, async (req, res, next) => {

        try {

            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    error: true,
                    message: 'Email is required.',
                });
            }

            const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid email format.',
                });
            }

            const admin = require('firebase-admin');
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(email);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    return res.status(404).json({
                        error: true,
                        message: 'User not found.',
                    });
                }
                throw error;
            }

            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);

            const examDoc = await examRef.get();
            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found.',
                });
            }

            const examData = examDoc.data();
            const users = examData.users || [];

            if (users.includes(userRecord.uid)) {
                return res.status(400).json({
                    error: true,
                    message: 'User is already a participant.',
                });
            }

            users.push(userRecord.uid);
            await examRef.update({ users });

            return res.status(200).json({
                error: false,
                message: 'User successfully added to the exam.',
            });

        } catch (error) {

            if (error.code === 'auth/user-not-found') {
                return res.status(404).json({
                    error: true,
                    message: 'User not found.',
                });
            }
            return next(error);
        }
    });

    // Remove user/student from an exam
    examRoute.delete("/students/:userId", examOwner, async (req, res, next) => {
        try {
            const { userId } = req.params; // Extract examId from route params

            // Validate request payload
            if (!userId) {
                return res.status(400).json({
                    error: true,
                    message: 'userId is required.',
                });
            }

            // Get Firestore instance
            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);

            // Fetch the exam document
            const examDoc = await examRef.get();
            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found.',
                });
            }

            const examData = examDoc.data();
            const users = examData.users || []; // Ensure `users` defaults to an empty array

            // Check if the user is part of the exam
            if (!users.includes(userId)) {
                return res.status(400).json({
                    error: true,
                    message: 'User is not a participant of this exam.',
                });
            }

            // Remove the user from the exam's user list
            const updatedUsers = users.filter(uid => uid !== userId);
            await examRef.update({ users: updatedUsers });

            // Respond with success
            return res.status(200).json({
                error: false,
                message: 'User successfully removed from the exam.',
            });

        } catch (error) {
            console.error('Error removing student from exam:', error);

            // Centralized error handling
            if (error.code === 'auth/user-not-found') {
                return res.status(404).json({
                    error: true,
                    message: 'User not found.',
                });
            }
            return next(error); // Pass error to Express error middleware
        }
    });

    // update user in exam
    examRoute.put("/students/:userId", examOwner, async (req, res, next) => {
        try {
            const { block } = req.query; // Query parameter to block/unblock
            const { userId } = req.params; // Extract examId and userId from the route

            // Validate the block query parameter
            if (typeof block === 'undefined') {
                return res.status(400).json({
                    error: true,
                    message: 'Block query parameter is required.',
                });
            }

            const blockBool = block === 'true'; // Convert to boolean

            // Get Firestore instance
            const db = getFirestore();
            const examRef = db.collection("exams").doc(examId);

            // Fetch the exam document
            const examDoc = await examRef.get();
            if (!examDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Exam not found.',
                });
            }

            const examData = examDoc.data();
            const users = examData.users || []; // Default to empty array
            const blocked = examData.blocked || []; // Default to empty array

            if (blockBool) {
                // Block the user: move from users to blocked
                if (!users.includes(userId)) {
                    return res.status(400).json({
                        error: true,
                        message: 'User is not a participant of this exam.',
                    });
                }

                const updatedUsers = users.filter(uid => uid !== userId);
                const updatedBlocked = [...blocked, userId];

                await examRef.update({
                    users: updatedUsers,
                    blocked: updatedBlocked,
                });
            } else {
                // Unblock the user: move from blocked to users
                if (!blocked.includes(userId)) {
                    return res.status(400).json({
                        error: true,
                        message: 'User is not blocked in this exam.',
                    });
                }

                const updatedBlocked = blocked.filter(uid => uid !== userId);
                const updatedUsers = [...users, userId];

                await examRef.update({
                    users: updatedUsers,
                    blocked: updatedBlocked,
                });
            }

            return res.status(200).json({
                error: false,
                message: `User successfully ${blockBool ? 'blocked' : 'unblocked'}.`,
            });
        } catch (error) {
            next(error)
        }
    });

    examRoute.get("/questions", examStudent, async (req, res, next) => {
        try {

            const db = getFirestore();

            // Reference to the 'questions' collection
            const questionsRef = db.collection("questions");

            // Query questions that are associated with the given examId
            const querySnapshot = await questionsRef.where("examId", "==", examId).get();

            // If no questions are found
            if (querySnapshot.empty) {
                return res.status(404).json({
                    error: true,
                    message: "No questions found for this exam."
                });
            }

            // Map through the documents and format the result
            const questionsPromises = querySnapshot.docs.map(async doc => {
                const imageUrl = await getFileUrl(`/uploads/questions/${doc.id}.jpg`)
                return {
                    id: doc.id,
                    image: imageUrl,
                    ...doc.data()
                }
            });

            const questions = await Promise.all(questionsPromises);
            // Sort the questions array by 'order' in ascending order
            questions.sort((a, b) => a.order - b.order);

            // Send the response
            res.json({
                error: false,
                message: "success",
                questions: questions
            });
        } catch (error) {
            next(error);
        }
    });

    // Add exam question
    examRoute.post("/questions", examOwner, multer.single('image'), async (req, res, next) => {

        try {

            var { correctOption, description, duration, options } = req.body;

            // Validate the request body
            if (!correctOption || !description || !duration || !options) {
                return res.status(400).json({
                    error: true,
                    message: 'All fields (correctOption, description, duration, options, and order) are required.',
                });
            }
            if (typeof options == "string") {
                options = JSON.parse(options)
            }

            if (!options[correctOption]) {
                return res.status(400).json({
                    error: true,
                    message: 'Correct option must be one of the provided options.',
                });
            }

            const db = getFirestore();
            const questionsRef = db.collection("questions");
            // Calculate the order using Firestore's count feature
            const aggregateSnapshot = await questionsRef.where("examId", "==", examId).get();
            const order = aggregateSnapshot.size + 1;

            // Add a new question document
            const newQuestion = {
                correctOption: correctOption,
                description: description,
                duration: duration,
                options: options,
                order: order > 0 ? order : 1,
                examId: examId,
            };

            const questionDoc = await questionsRef.add(newQuestion);
            if (!questionDoc.id) {
                return req.status(400).json({
                    error: true,
                    message: "Failed to create question, please try again letter"
                })
            }

            if (req.file) {
                const fileUrl = await uploadFile(req.file, `/uploads/questions/${questionDoc.id}.jpg`)
                console.log(fileUrl)
            }


            res.status(201).json({
                error: false,
                message: 'Question added successfully.',
                question: {
                    id: questionDoc.id,
                    ...newQuestion
                }
            });
        } catch (error) {
            next(error);
        }
    });

    examRoute.put("/questions/order", examOwner, async (req, res, next) => {
        try {
            const { questionMap } = req.body;

            if (!questionMap || typeof questionMap !== 'object' || Object.keys(questionMap).length === 0) {
                return res.status(400).json({
                    error: true,
                    message: "Invalid or empty questionMap provided.",
                });
            }

            const db = getFirestore();
            const batch = db.batch();

            Object.keys(questionMap).forEach(id => {
                const order = questionMap[id];
                const questionRef = db.collection('questions').doc(id);
                batch.update(questionRef, { order });
            });

            await batch.commit();

            console.log(`Reordering questions: ${JSON.stringify(questionMap)}`);

            res.json({
                error: false,
                message: "Questions reordered successfully.",
            });
        } catch (error) {
            next(error);
        }
    });

    // Update exam question
    examRoute.put("/questions/:questionId", examOwner, multer.single("image"), async (req, res, next) => {

        try {

            const { questionId } = req.params;
            var { correctOption, description, duration, options, order } = req.body;

            // Validate the request body
            if (!questionId || !correctOption || !description || !duration || !options || typeof order === 'undefined') {
                return res.status(400).json({
                    error: true,
                    message: 'All fields (questionId, correctOption, description, duration, options, and order) are required.',
                });
            }

            if (typeof options == "string") {
                options = JSON.parse(options)
            }

            if (!options[correctOption]) {
                return res.status(400).json({
                    error: true,
                    message: 'Correct option must be one of the provided options.',
                });
            }

            const db = getFirestore();
            const questionRef = db.collection("questions").doc(questionId);

            const questionDoc = await questionRef.get();

            // Check if the question exists
            if (!questionDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: 'Question not found.',
                });
            }

            // Update the question document
            await questionRef.update({
                correctOption,
                description,
                duration,
                options,
                order,
            });

            if (req.file) {
                const fileUrl = await uploadFile(req.file, `/uploads/questions/${questionId}.jpg`)
                console.log(fileUrl)
            }

            res.status(200).json({
                error: false,
                message: 'Question updated successfully.',
            });
        } catch (error) {
            next(error);
        }
    });

    // Delete exam question
    examRoute.delete("/questions/:questionId", examOwner, async (req, res, next) => {
        try {
            const { questionId } = req.params;

            // Validate the request parameter
            if (!questionId) {
                return res.status(400).json({
                    error: true,
                    message: "Question ID (questionId) is required.",
                });
            }

            const db = getFirestore();
            const questionRef = db.collection("questions").doc(questionId);
            const questionDoc = await questionRef.get();

            // Check if the question exists
            if (!questionDoc.exists) {
                return res.status(404).json({
                    error: true,
                    message: "Question not found.",
                });
            }

            // Extract the examId and the order of the question to be deleted
            const { examId, order } = questionDoc.data();

            // Get all questions for the same exam
            const questionsSnapshot = await db.collection("questions")
                .where("examId", "==", examId)
                .get();

            const questions = questionsSnapshot.docs;

            // Update order of other questions
            const batch = db.batch();
            questions.forEach((doc) => {
                const questionData = doc.data();
                if (questionData.order > order) {
                    batch.update(doc.ref, { order: questionData.order - 1 });
                }
            });

            // Delete the question document
            batch.delete(questionRef);
            await batch.commit();

            res.status(200).json({
                error: false,
                message: "Question deleted successfully and order updated.",
            });
        } catch (error) {
            next(error);
        }
    });


    // add or update answer
    examRoute.post("/answers", examStudent, async (req, res, next) => {

        try {

            const user = req.user;
            const { answers } = req.body;

            if (!Array.isArray(answers)) {
                return res.status(400).json({
                    error: true,
                    message: "Summary should be an array.",
                });
            }

            const db = getFirestore();

            const answerQuery = await db.collection("answers")
                .where("examId", "==", examId)
                .where("userId", "==", user.uid)
                .limit(1)
                .get();

            let answersData = null;
            const formattedAnswers = answers.map(answer => {
                if (typeof answer.summary == "string") {
                    answer.summary = JSON.parse(answer.summary)
                }
                return answer
            })

            if (answerQuery.empty) {

                answersData = {
                    examId,
                    userId: user.uid,
                    createdAt: new Date(),
                    data: formattedAnswers,
                };

                await db.collection("answers").add(answersData);

            } else {

                const answerDoc = answerQuery.docs[0];
                const existingData = answerDoc.data().data || [];

                const uniqueData = [...existingData, ...formattedAnswers].reduce((acc, current) => {
                    const index = acc.findIndex(item => item.questionId === current.questionId);

                    if (index === -1) {
                        acc.push(current);
                    } else {
                        acc[index] = current;
                    }

                    return acc;
                }, []);


                await answerDoc.ref.update({ data: uniqueData });

            }

            res.status(200).json({
                error: false,
                message: "Answer submitted successfully.",
            });
        } catch (error) {
            console.error("Error adding/updating answer:", error);
            next(error);
        }
    });

    examRoute(req, res, next);

})


module.exports = router