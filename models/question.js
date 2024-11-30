// models/question.js
const db = require('./db');

const getAllQuestions = async () => {
  return db.query('SELECT * FROM exam_questions');
};

const getQuestionById = async (id) => {
  return db.query('SELECT * FROM exam_questions WHERE id = ?', [id]);
};

const createQuestion = async (teacher_id, question_text, answer_key, difficulty_level) => {
  return db.query(
    'INSERT INTO exam_questions (teacher_id, question_text, answer_key, difficulty_level) VALUES (?, ?, ?, ?)',
    [teacher_id, question_text, answer_key, difficulty_level]
  );
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
};
