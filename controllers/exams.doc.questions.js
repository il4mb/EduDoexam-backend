const express = require('express');
const router = express.Router();




router.get("/", (req, res, next) => {
    try {


    } catch (error) {
        next(error);
    }
})


module.exports = router;