// models/student.js
const db = require('./db');

const getAllStudents = async () => {
  return db.query('SELECT * FROM students');
};

const getStudentById = async (id) => {
  return db.query('SELECT * FROM students WHERE id = ?', [id]);
};

const createStudent = async (name, email, password, grade_level) => {
  return db.query(
    'INSERT INTO students (name, email, password, grade_level) VALUES (?, ?, ?, ?)',
    [name, email, password, grade_level]
  );
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
};
