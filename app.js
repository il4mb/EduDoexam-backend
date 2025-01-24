require('dotenv').config()

const express = require('express');
const cors = require('cors');
const authRouters = require("./controllers/auth")
const examsRouters = require("./controllers/exams")
const profileRouters = require("./controllers/profile")
const productRouters = require("./controllers/product")
const app = express();
const middleware = require('./utils/middleware');

app.use(cors())

app.get("/privacy", (req, res) => {
    res.status(200).contentType(".html").sendFile(__dirname + "/public/privacy.html")
})

app.use(middleware.requestLogger)
app.use(express.json());
app.use(middleware.tokenExtractor);


app.use('/api/auth', authRouters);
app.use('/api/product', productRouters);
app.use('/api/profile', profileRouters);
app.use('/api/exams', examsRouters);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app
