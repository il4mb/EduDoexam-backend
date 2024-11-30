const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(require("./firestore-service-key.json"))
});


const express = require('express');
const cors = require('cors');
const authRouters = require("./controllers/auth")
const usersRouters = require("./controllers/users")
const examsRouters = require("./controllers/exams")
const profileRouters = require("./controllers/profile")
const app = express();
const middleware = require('./utils/middleware');

app.use(middleware.requestLogger)

app.use(express.json());
app.use(middleware.tokenExtractor);

app.use('/api/auth', authRouters);
app.use('/api/profile', profileRouters);
app.use('/api/users', usersRouters);
app.use('/api/exams', examsRouters);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

// Student Routes
app.get('/api/students', async (req, res) => {
  try {
    const [students] = await studentModel.getAllStudents();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const [student] = await studentModel.getStudentById(req.params.id);
    if (student.length === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(student[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve student' });
  }
});

app.post('/api/students', async (req, res) => {
  const { name, email, password, grade_level } = req.body;
  try {
    await studentModel.createStudent(name, email, password, grade_level);
    res.status(201).json({ message: 'Student created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// Teacher Routes
app.get('/api/teachers', async (req, res) => {
  try {
    const [teachers] = await teacherModel.getAllTeachers();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve teachers' });
  }
});

app.get('/api/teachers/:id', async (req, res) => {
  try {
    const [teacher] = await teacherModel.getTeacherById(req.params.id);
    if (teacher.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve teacher' });
  }
});

app.post('/api/teachers', async (req, res) => {
  const { name, email, password, subject } = req.body;
  try {
    await teacherModel.createTeacher(name, email, password, subject);
    res.status(201).json({ message: 'Teacher created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Question Routes
app.get('/api/questions', async (req, res) => {
  try {
    const [questions] = await questionModel.getAllQuestions();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
});

app.get('/api/questions/:id', async (req, res) => {
  try {
    const [question] = await questionModel.getQuestionById(req.params.id);
    if (question.length === 0) return res.status(404).json({ error: 'Question not found' });
    res.json(question[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve question' });
  }
});

app.post('/api/questions', async (req, res) => {
  const { teacher_id, question_text, answer_key, difficulty } = req.body;
  try {
    await questionModel.createQuestion(teacher_id, question_text, answer_key, difficulty);
    res.status(201).json({ message: 'Question created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create question' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
