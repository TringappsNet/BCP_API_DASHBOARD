const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', bodyParser.json(), async (req, res) => {
  const { token, firstName, lastName, phoneNo, password } = req.body;

  if (!token || !firstName || !lastName || !phoneNo || !password) {
    return res.status(400).json({ errors: {
        token: 'token is required',
        firstName: 'First name is required',
        lastName: 'Last name is required',
        phoneNo: 'Phone number is required',  
        password: 'Password is required'
      }});
  }

  if (password.length < 6) {
    return res.status(400).json({ errors: { password: 'Password must be at least 6 characters long' } });
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt();
    // Generate password hash with the generated salt
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if the user exists
    const selectUserQuery = 'SELECT * FROM users WHERE InviteToken = ?';
    const [userRows] = await pool.query(selectUserQuery, [token]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ errors: { token: 'User not found' } });
    }

    // Call the stored procedure to update or insert user data, including the salt
    await pool.query('CALL RegisterUser(?, ?, ?, ?, ?, ?)', [token, firstName, lastName, phoneNo, passwordHash, salt]);

    // Remove the token from the database
    await pool.query('UPDATE users SET InviteToken = NULL WHERE InviteToken = ?', [token]);

    console.log("User registered or updated successfully!");
   
    res.status(201).json({ message: 'User registered or updated successfully' });
  } catch (error) {
    console.error("Error registering or updating user:", error);
    res.status(500).json({ message: 'Error registering or updating user' });
  }
});

module.exports = router;
