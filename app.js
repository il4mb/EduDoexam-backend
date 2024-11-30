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

app.use(cors());
app.use(express.json());
app.use(middleware.tokenExtractor);

app.use('/api/auth', authRouters);
app.use('/api/profile', profileRouters);
app.use('/api/users', usersRouters);
app.use('/api/exams', examsRouters);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;