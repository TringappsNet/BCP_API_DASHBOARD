const express = require('express');
const router = express.Router();
const pool = require('./pool');

// POST endpoint to add organization
router.post('/', async (req, res) => {
    try {
        // Extract organization name from request body
        const { org_name } = req.body;

        // Call the stored procedure to add the organization
        const result = await pool.query('CALL AddOrganization(?)', [org_name]);

        // Send response based on the result of the stored procedure
        res.status(200).json(result[0][0]);
    } catch (error) {
        console.error('Error adding organization:', error);
        return res.status(500).json({ error: 'Error adding organization' });
    }
});

module.exports = router;
