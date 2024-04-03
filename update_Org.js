// Import necessary modules
const express = require('express');
const router = express.Router();
const pool = require('./pool'); // Assuming you have a pool configured for your database connection

// Endpoint to update org_name
router.put('/', async (req, res) => {
    const { org_id, new_org_name } = req.body;

    try {
        // Check if org_id and new_org_name are provided
        if (!org_id || !new_org_name) {
            return res.status(400).json({ error: 'Organization ID and new organization name are required!' });
        }

        // Execute SQL query to update org_name
        const result = await pool.query('UPDATE organization SET org_name = ? WHERE org_ID = ?', [new_org_name, org_id]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organization not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'Organization name updated successfully' });
    } catch (error) {
        console.error("Error updating organization name:", error);
        return res.status(500).json({ error: 'Error updating organization name' });
    }
});

module.exports = router;
