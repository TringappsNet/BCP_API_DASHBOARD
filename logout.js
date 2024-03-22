const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');


router.post('/', (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.status(200).json({ message: 'Logged Out' });
   
   });

module.exports = router;