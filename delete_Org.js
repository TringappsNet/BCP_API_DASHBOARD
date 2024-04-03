
const express = require('express');
const router = express.Router();
const pool = require('./pool'); 


router.delete('/', async (req, res) => {
    const { org_ID } = req.body;

    try {
        // Check if org_ID is provided
        if (!org_ID) {
            return res.status(400).json({ error: 'Organization ID is required!' });
        }

        // Execute SQL query to delete organization
        const result = await pool.query('DELETE FROM organization WHERE org_ID = ?', [org_ID]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organization not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error("Error deleting organization:", error);
        return res.status(500).json({ error: 'Error deleting organization' });
    }
});

module.exports = router;
