// models/teacher.js
const db = require('./db');

const getAllTeachers = async () => {
  return db.query('SELECT * FROM teachers');
};

const getTeacherById = async (id) => {
  return db.query('SELECT * FROM teachers WHERE id = ?', [id]);
};

const createTeacher = async (name, email, password, subject) => {
  return db.query(
    'INSERT INTO teachers (name, email, password, subject) VALUES (?, ?, ?, ?)',
    [name, email, password, subject]
  );
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
};
