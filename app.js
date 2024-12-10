require('dotenv').config()
const path = require("path")

const express = require('express');
const cors = require('cors');
const authRouters = require("./controllers/auth")
const usersRouters = require("./controllers/users")
const examsRouters = require("./controllers/exams")
const profileRouters = require("./controllers/profile")
const app = express();
const middleware = require('./utils/middleware');

app.use(cors())
app.use(middleware.requestLogger)
app.use(express.json());
app.use(middleware.tokenExtractor);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRouters);
app.use('/api/profile', profileRouters);
app.use('/api/users', usersRouters);
app.use('/api/exams', examsRouters);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app
