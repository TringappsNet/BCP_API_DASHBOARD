const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.get('/', (req, res) => {
    res.send('Hello World');
  });

router.get('/sample', (req, res) => {
    res.send('sample ');
  });

router.post('/register', bodyParser.json(), async (req, res) => {
    const { userName, password, email, organization, phoneNo } = req.body;

    if (!userName || !password || !email || !organization || !phoneNo) {
        return res.status(400).json({ errors: {
            userName: 'Username is required',
            password: 'Password is required',
            email: 'Email is required',
            organization: 'Organization is required',
            phoneNo: 'Mobile number is required'
          }});    }
  
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
      const selectUserQuery = 'SELECT * FROM login WHERE UserName = ?';
      const [rows] = await pool.query(selectUserQuery, [userName]);
      if (rows.length > 0) {
        return res.status(400).json({ errors: { userName: 'Username already exists' } });
      }
  
      // Check if the email already exists in the database
      const selectEmailQuery = 'SELECT * FROM login WHERE Email = ?';
      const [rows2] = await pool.query(selectEmailQuery, [email]);
      if (rows2.length > 0) {
        return res.status(400).json({ errors: { email: 'Email already exists' } });
      }
  
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);
  
      // Insert user data into the Login table
      const insertQuery = 'INSERT INTO login (UserName, Password, Email,Organization, PhoneNo, Salt) VALUES (?, ?, ?, ?, ?, ?)';
      const [result] = await pool.query(insertQuery, [userName, passwordHash, email, organization, phoneNo, salt]);
  
      console.log("User registered successfully!");
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: 'Error registering user' });
    }
});


router.post('/login', async (req, res) => {
  const { userName, password } = req.body;
  const errorResponse = (statusCode, message) => ({
    statusCode,
    message
  });

  if (!userName || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM login WHERE UserName = ?', [userName]);
    if (rows.length > 0) {
      const user = rows[0];
      console.log('Hashed password from database:', user.Password);
      const hashedPassword = await bcrypt.hash(password, user.Salt);
      console.log('Hashed password from entered password:', hashedPassword);
      if (hashedPassword === user.Password) {
        // Create a session for the user
        req.session.userId = user.ID;
        req.session.userName = user.UserName;
        req.session.organization = user.Organization;

        // Set the session ID as a cookie in the response headers
        res.cookie('sessionId', req.sessionID, {
          httpOnly: true,
          secure: false, // Set to true if using HTTPS
          maxAge: 24 * 60 * 60 * 1000 // expires after 24 hours
        });

        res.status(200).json({
          message: 'Logged In',
          username: req.session.userName,
          organization: req.session.organization
        });
        
       } else {
        res.status(401).json({ message: 'Invalid Password!' });
      }
    } else {
      res.status(400).json({ message: 'User Not Found!' });
    }
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: 'Error logging in user' });
  }
});


router.post('/logout', (req, res) => {
 // Destroy the session
 req.session.destroy();
 res.status(200).json({ message: 'Logged Out' });

});
module.exports = router;

