const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.put('/', (req, res) => {
    const { email, isActive } = req.body;

    // Check if email and isActive are provided
    if (!email || isActive === undefined || isActive === null) {
        return res.status(400).json({ error: 'Email and isActive parameter are required!' });
    }

    // Execute SQL query to update isActive column
    pool.query('UPDATE users SET isActive = ? WHERE Email = ?', [isActive, email], (err, result) => {
        if (err) {
            console.error("Error updating user isActive status:", err);
            return res.status(500).json({ error: 'Error updating user isActive status' });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'User isActive status updated successfully' });
    });
});

module.exports = router;
