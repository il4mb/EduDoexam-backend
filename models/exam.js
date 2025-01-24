class Exam {

}

class Participant {
    status = "pending";
    joinDescription = "invition";
    isBlocked = false;
    joinAt = new Date();
    role = "student"
}


class Question {
    constructor(question) {

    }
}

module.exports = {
    Exam,
    Participant,
    Question
}