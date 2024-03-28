const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  
  if ( !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Email, old password, and new password are required' });
  }
  
  try {
    // Check if the user exists in the database
    const [rows] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);
    
    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    const user = rows[0]; // Extract the first row from the result
    
    // Validate the old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.PasswordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid old password' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password in the database using the user's ID
    const updateQuery = 'UPDATE users SET PasswordHash = ?, Salt = ? WHERE UserID = ?';
    await pool.query(updateQuery, [newPasswordHash, salt, user.UserID]);
    
    console.log("Password reset successfully!");
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;