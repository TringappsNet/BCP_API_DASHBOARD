const express = require('express');
const router = express.Router();
const pool = require('./pool');

// POST endpoint to create organization
router.post('/', async (req, res) => {
    try {
        // Extract organization name from request body
        const { org_name } = req.body;

        // Check if organization name is provided
        if (!org_name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // Check if organization already exists
        const [existingOrg] = await pool.query('SELECT * FROM organization WHERE org_name = ?', [org_name]);
        if (existingOrg.length > 0) {
            return res.status(400).json({ error: 'Organization already exists' });
        }

        // Insert the organization into the database
        const result = await pool.query('INSERT INTO organization (org_name) VALUES (?)', [org_name]);

        // Send success response
        res.status(201).json({ message: 'Organization created successfully', org_ID: result.insertId });
    } catch (error) {
        console.error('Error creating organization:', error);
        return res.status(500).json({ error: 'Error creating organization' });
    }
});

module.exports = router;
