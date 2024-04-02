const express = require('express');
const router = express.Router();
const pool = require('./pool');

// DELETE endpoint to delete a user by UserID
router.delete('/', async (req, res) => {
    try {
        // Extract UserID from request body
        const { userID } = req.body;

        // Check if userID is provided
        if (!userID) {
            return res.status(400).json({ error: 'UserID is required in the request body' });
        }

        // Call the stored procedure or SQL query to delete the user
        const result = await pool.query('DELETE FROM users WHERE UserID = ?', [userID]);

        // Check if the user was deleted successfully
        if (result.affectedRows === 1) {
            return res.status(200).json({ message: 'User deleted successfully' });
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: 'Error deleting user' });
    }
});

module.exports = router;
