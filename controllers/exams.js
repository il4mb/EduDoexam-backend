const router = require('express').Router();
const middleware = require('../utils/middleware');
const { getFirestore } = require('firebase-admin/firestore');


const addQuestion = async (question) => {

    try {

        const db = getFirestore();
        await db.collection('questions').add(question);

    } catch (error) {

        throw new Error('Failed to add question: ' + error.message);
    }
};

const getQuestionsByExamId = async (examId) => {

    try {
        const db = getFirestore();

        const questionsRef = db.collection('questions');
        const querySnapshot = await questionsRef.where('examId', '==', examId).get();

        if (querySnapshot.empty) {
            console.log('No matching documents.');
            return [];
        }

        // Extract data from the documents
        const questions = [];
        querySnapshot.forEach((doc) => {
            questions.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return questions;

    } catch (error) {
        console.error('Error retrieving questions:', error);
        throw new Error('Failed to retrieve questions.');
    }
};

const getUserExams = async (userId) => {

    try {
        const db = getFirestore();

        const tableRef = db.collection('users-exam');
        const querySnapshot = await tableRef.where('userId', '==', userId).get();

        if (querySnapshot.empty) {
            console.log('No matching documents.');
            return [];
        }

        // Extract data from the documents
        const list = [];
        querySnapshot.forEach((doc) => {
            list.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        return list;

    } catch (error) {
        console.error('Error retrieving exams:', error);
        throw new Error('Failed to retrieve exams.');
    }
};

const getExamUsers = async (examId) => {

    try {

        const db = getFirestore();

        const tableRef = db.collection('users-exam');
        const querySnapshot = await tableRef.where('examId', '==', examId).get();

        if (querySnapshot.empty) {
            console.log('No matching documents.');
            return [];
        }

        // Use Promise.all to fetch user details
        const userPromises = querySnapshot.docs.map(async (doc) => {
            const uid = doc.data().userId;
            const docRef = db.collection('users').doc(uid);
            const docSnapshot = await docRef.get();
            return { ...docSnapshot.data() }; // Include the user ID
        });

        // Wait for all promises to resolve
        const users = await Promise.all(userPromises);
        return users;

    } catch (error) {
        console.error('Error retrieving users:', error);
        throw new Error('Failed to retrieve users.');
    }
};

router.get("/upcoming", middleware.userExtractor, async (req, res, next) => {
    try {
        
        const db = getFirestore();

        const uid = req.user.uid; // Extract user ID
        const tableRef = db.collection("exams");

        // Calculate the date for one week ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Query exams containing uid in "users" field and with startDate > oneWeekAgo
        const querySnapshot = await tableRef
            .where("users", "array-contains", uid)
            .where("startDate", ">", oneWeekAgo)
            .get();

        // Check if no matching documents were found
        if (querySnapshot.empty) {
            console.log("No matching documents.");
            return res.status(404).json({ message: "No upcoming exams found." });
        }

        // Map the results into a response array
        const exams = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        console.log(exams)

        res.json({
            error: false,
            exams: exams
        });

    } catch (error) {
        next(error);
    }
});


// Route to create an exam
router.post("/", middleware.userExtractor, async (req, res) => {

    try {

        const { title, subtitle } = req.body;
        const uid = req.user.uid;

        const initialQuestion = {
            description: "this is initial question",
            correct: "A",
            options: {
                A: "option A",
                B: "option B",
                C: "option C",
                D: "option D",
            },
            duration: 10, // 10 minutes
            order: 1
        };

        const db = getFirestore();
        const examRef = await db.collection('exams').add({
            title,
            subtitle,
            createdBy: uid,
            createdAt: new Date(),
        });

        initialQuestion.examId = examRef.id
        // Add the initial question for the created exam
        await addQuestion(initialQuestion);

        // Send a res to the client
        res.status(201).json({
            error: false,
            message: "Exam created successfully",
            examId: examRef.id
        });
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to create exam. Please try again later.'
        });
    }
});

// Get exam by id
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const db = getFirestore();
        const docRef = db.collection("exams").doc(id);
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: "Exam doesn't exist",
            });
        }

        const examData = docSnapshot.data();
        let questions = await getQuestionsByExamId(docSnapshot.id);
        questions = questions.map(question => {
            delete question.examId
            return question
        })
        let users = await getExamUsers(docSnapshot.id)

        // Return response
        res.json({
            error: false,
            message: "Exam fetch successful",
            exam: {
                ...examData,
                questions,
                users
            },
        });

    } catch (error) {
        console.error('Error fetching exam:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to fetch exam. Please try again later.',
        });
    }
});

// Update exam by id
router.put('/:id', middleware.userExtractor, async (req, res) => {

    try {

        const { title, subtitle } = req.body;

        if (!title || !subtitle) {
            return res.status(400).json({
                error: true,
                message: 'Both title and subtitle are required fields.',
            });
        }
        if (title.trim().length <= 3) {
            return res.status(400).json({
                error: true,
                message: 'Invalid title. Title should have more than 3 characters.',
            });
        }
        if (subtitle.trim().length <= 3) {
            return res.status(400).json({
                error: true,
                message: 'Invalid subtitle. Subtitle should have more than 3 characters.',
            });
        }



        const examId = req.params.id;
        const user = req.user;
        const db = getFirestore();
        const docRef = db.collection('exams').doc(examId);
        const docSnapshot = await docRef.get(); // Get the document snapshot

        if (!docSnapshot.exists) {
            return res.status(404).json({
                error: true,
                message: 'Exam not found'
            });
        }

        const exam = docSnapshot.data();
        if (user.uid !== exam.createdBy) {
            return res.status(403).json({
                error: true,
                message: 'Unauthorized to update this exam.',
            });
        }

        // Update exam details
        await docRef.update({ title: title, subtitle: subtitle });

        // Ensure that res is only sent once
        if (!res.headersSent) {
            res.status(200).json({
                error: false,
                message: 'Exam updated successfully.',
                exam: Object.assign(exam, { title, subtitle })
            });
        }

    } catch (error) {
        console.error('Error fetching exam data:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to retrieve exam data'
        });
    }
});

// Get exam users
router.get("/users/:id", async (req, res) => {

    try {

        const examId = req.params.id
        const users  = await getExamUsers(examId)
        res.json({
            error: false,
            message: "Fetch users successful",
            users: users
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to fetch users. Please try again later.',
        });
    }
})

// Get exam users
router.get("/questions/:id", async (req, res) => {

    try {

        const examId = req.params.id
        const questions  = await getQuestionsByExamId(examId)
        res.json({
            error: false,
            message: "Fetch questions successful",
            questions: questions
        });

    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to fetch questions. Please try again later.',
        });
    }
})

module.exports = router