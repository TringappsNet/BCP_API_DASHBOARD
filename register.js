const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');


router.post('/', bodyParser.json(), async (req, res) => {
  const { userName, password, email, organization, phoneNo } = req.body;

  if (!userName || !password || !email || !organization || !phoneNo) {
    return res.status(400).json({ errors: {
        userName: 'Username is required',
        password: 'Password is required',
        email: 'Email is required',
        organization: 'Organization is required',
        phoneNo: 'Mobile number is required'
      }});
  }

  if (userName.length < 3) {
    return res.status(400).json({ errors: { userName: 'Username must be at least 3 characters long' } });
  }

  if (organization.length < 3) {
    return res.status(400).json({ errors: { organization: 'Organization must be at least 3 characters long' } });
  }

  if (!/^[\w-]+(.[\w-]+)*@([\w-]+.)+[a-zA-Z]{2,7}$/.test(email)) {
    return res.status(400).json({ errors: { email: 'Email is not a valid email address' } });
  }

  try {
    // Check if the username already exists in the database
    const selectUserQuery = 'SELECT * FROM users WHERE UserName = ?';
    const [rows] = await pool.query(selectUserQuery, [userName]);
    if (rows.length > 0) {
      return res.status(400).json({ errors: { userName: 'Username already exists' } });
    }

    // Check if the email already exists in the database
    const selectEmailQuery = 'SELECT * FROM users WHERE Email = ?';
    const [rows2] = await pool.query(selectEmailQuery, [email]);
    if (rows2.length > 0) {
      return res.status(400).json({ errors: { email: 'Email already exists' } });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user data into the Users table
    const [result] = await pool.query('CALL RegisterUser(?, ?, ?, ?, ?, ?)', [userName, passwordHash, salt, email, organization, phoneNo]);

    console.log("User registered successfully!");
   
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

module.exports = router;