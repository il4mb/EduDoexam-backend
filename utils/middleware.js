const { getFirestore } = require('firebase-admin/firestore')
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

/**
 * userExtractor
 * - user is assign to request
 */
const userExtractor = async (request, response, next) => {
  const token = request.token;

  if (token) {
    try {
      const { getAdmin } = require("../utils/firebase")
      const admin = getAdmin()
      const decodedToken = await admin.auth().verifyIdToken(token);

      if (!decodedToken.uid) {
        console.error("Invalid token")
        return response.status(401).json({
          error: true,
          message: 'Token invalid'
        });
      }

      request.user = decodedToken;
      next();

    } catch (error) {
      console.error("Token verification failed:", error);
      return response.status(401).json({
        error: true,
        message: `Token verification failed`
      });
    }
  } else {
    console.error("Token missing")
    return response.status(401).json({
      error: true,
      message: 'Token missing'
    });
  }
};


/**
 * ExamAdminParticipant
 * - participant is assign to request
 */
const examAdminParticipant = async (req, res, next) => {

  try {

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'User is missing'
      });
    }
    const examId = req.params.examId
    if (!examId) {
      return res.status(400).json({
        error: true,
        message: "Invalid path, exam id not found in path"
      })
    }
    const db = getFirestore();
    const participantsRef = db.collection("exams").doc(examId).collection("participants");
    const participantDoc = await participantsRef.doc(user.uid).get();
    if (!participantDoc.exists) {
      return res.status(404).json({
        error: true,
        message: 'Youre not a participant of this exam'
      });
    }
    const participant = participantDoc.data();
    if (!["admin", "owner"].includes(participant.role)) {
      return res.status(403).json({
        error: true,
        message: 'You are not an admin of this exam'
      });
    }

    req.participant = participant;

    next();

  } catch (err) {
    return next(err);
  }

}

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
}

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  userExtractor,
  tokenExtractor,
  examAdminParticipant,
  examStudent
}
