const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.delete('/', async (req, res) => {
  const { email, userId } = req.body;

  try {
    // Check if email and userId are provided
    if (!email || userId === undefined || userId === null) {
      return res
        .status(400)
        .json({ error: 'Email and userId parameter are required!' });
    }

    // Execute SQL query to update userId column
    const result = await pool.query(
      'DELETE FROM users WHERE UserID = ? AND Email = ?',
      [userId, email]
    );

    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found!' });
    }

    // Send success response
    return res
      .status(200)
      .json({ message: 'User Deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res
      .status(500)
      .json({ error: 'Error deleting user' });
  }
});

module.exports = router;
