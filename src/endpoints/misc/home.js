const express = require('express');
const router = express.Router();
const pool = require('../../utils/pool');

// GET endpoint to retrieve all roles
router.get('/', async (req, res) => {
    res.send('Welcome to BCP backend');
});

module.exports = router;
