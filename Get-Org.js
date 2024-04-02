const express = require('express');
const router = express.Router();
const pool = require('./pool');

// GET endpoint to retrieve all organization names
router.get('/', async (req, res) => {
    try {
        // Query the database to retrieve all organization names
        const [rows] = await pool.query('SELECT org_ID, org_name FROM organization');

        // Send back the array of organization names
        res.status(200).json(rows);
    } catch (error) {
        // If an error occurs, send a 500 Internal Server Error response
        console.error('Error retrieving organization names:', error);
        res.status(500).json({ error: 'Error retrieving organization names' });
    }
});

module.exports = router;