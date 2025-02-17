"use strict";
class Exam {
}
class Participant {
    status = "pending";
    joinDescription = "invition";
    isBlocked = false;
    joinAt = new Date();
    role = "student";
}
module.exports = {
    Exam,
    Participant
};
