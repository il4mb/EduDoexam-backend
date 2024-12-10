const { request } = require('express')
const logger = require('./logger')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}


const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: true, message: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {

  logger.error(error);

  const firebaseErrors = {
    "auth/invalid-credential": { status: 401, message: "Invalid Credential." },
    "auth/user-disabled": { status: 403, message: "User account has been disabled by an administrator." },
    "auth/user-not-found": { status: 404, message: "No user found with the provided credentials." },
    "auth/email-already-in-use": { status: 409, message: "The email address is already in use by another account." },
    "auth/weak-password": { status: 400, message: "The password must be at least 6 characters long." },
    "auth/invalid-email": { status: 400, message: "The provided email is invalid." },
    "auth/operation-not-allowed": { status: 403, message: "The requested operation is not allowed." },
    "auth/too-many-requests": { status: 429, message: "Too many requests. Please try again later." },
    "auth/account-exists-with-different-credential": { status: 409, message: "An account already exists with the same email address but different sign-in credentials." },
    "auth/requires-recent-login": { status: 401, message: "This operation requires recent login. Please log in again.", },
    "auth/invalid-verification-code": { status: 400, message: "The verification code is invalid." },
    "auth/invalid-verification-id": { status: 400, message: "The verification ID is invalid." },
  };


  if (error.name == "FirebaseError") {

    if (firebaseErrors[error.code]) {
      const { status, message } = firebaseErrors[error.code];
      return response.status(status || 500).json({ error: true, message: (message || error.message) });
    }

  } else {

    response.status(500).json({
      error: true,
      message: error.message
    })
  }

  // Pass the error to the default error handler if it's not handled here
  next(error);
}

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('Authorization');
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7);
  } else {
    request.token = null;
  }
  next();
};

const userExtractor = async (request, response, next) => {
  const token = request.token;

  if (token) {
    try {
      const admin = require("firebase-admin");
      const decodedToken = await admin.auth().verifyIdToken(token);

      if (!decodedToken.uid) {
        return response.status(401).json({
          error: true,
          message: 'Token invalid'
        });
      }

      request.user = decodedToken;
      next(); // Proceed to the next middleware or route handler

    } catch (error) {
      return response.status(401).json({
        error: true,
        message: `Token verification failed`
      });
    }
  } else {
    return response.status(401).json({
      error: true,
      message: 'Token missing'
    });
  }
};

const examOwner = async (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({
      error: true,
      message: 'User is missing'
    });
  }

  try {
    const examId = req.params.examId; // Get examId from the URL parameter
    const db = getFirestore();
    const examRef = db.collection("exams").doc(examId); // Reference to the exam document

    // Fetch the exam document
    const examDoc = await examRef.get();
    
    // If the exam doesn't exist
    if (!examDoc.exists) {
      return res.status(404).json({
        error: true,
        message: 'Exam not found'
      });
    }

    // Check if the current user is the owner of the exam
    const examData = examDoc.data();
    if (examData.createdBy !== user.uid) { // Assuming `user.uid` is the ID of the logged-in user
      return res.status(403).json({
        error: true,
        message: 'You are not the owner of this exam'
      });
    }

    // If the user is the owner, move to the next middleware or route handler
    next();

  } catch (err) {
    return next(err);
  }
};

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor,
  tokenExtractor,
  examOwner
}
