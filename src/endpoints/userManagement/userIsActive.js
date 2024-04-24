const express = require('express');
const router = express.Router();
const pool = require('../../utils/pool');
const {successMessages} = require('../../utils/successMessages');
const {errorMessages} = require('../../utils/errorMessages');



router.put('/', async (req, res) => {
    const { email, isActive } = req.body;

    try {
        // Check if email and isActive are provided
        if (!email || isActive === undefined || isActive === null) {
            return res.status(400).json({ error: errorMessages.MISSING_PARAMS });
        }

        // Execute SQL query to update isActive column
        const result = await pool.query('UPDATE users SET isActive = ? WHERE Email = ?', [isActive, email]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: errorMessages.USER_NOT_FOUND });
        }

        // Send success response
        return res.status(200).json({ message: successMessages.USER_ISACTIVE_UPDATED });
    } catch (error) {
        console.error("Error updating user isActive status:", error);
        return res.status(500).json({ error: errorMessages.ERROR_UPDATING_ISACTIVE_STATUS });
    }
});

module.exports = router;
