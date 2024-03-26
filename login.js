const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
    const { userName, password } = req.body;
    const errorResponse = (statusCode, message) => ({
      statusCode,
      message
    });
    if (!userName || !password) {
      return res.status(400).json({ error: 'Username and password are required!' });
    }

    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE UserName = ?', [userName]);
      if (rows.length > 0) {
        const user = rows[0];
        console.log('Hashed password from database:', user.PasswordHash);
        const hashedPassword = await bcrypt.hash(password, user.Salt);
        console.log('Hashed password from entered password:', hashedPassword);
        if (hashedPassword === user.PasswordHash) {
          // Create a session for the user
          req.session.userId = user.ID;
          req.session.userName = user.UserName;
          req.session.organization = user.Organization;

          // Set the session ID as a cookie in the response headers
          res.cookie('sessionId', req.sessionID, {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 10 * 60 * 1000 // 10 minutes
          });

          res.status(200).json({
            message: 'Logged In',
            username: req.session.userName,
            organization: req.session.organization
          });

         } else {
          res.status(401).json({ message: 'Invalid Password!'});
        }
      } else {
        res.status(400).json({ message: 'User Not Found!'});
      }
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ message: 'Error logging in user' });
    }
  });

module.exports = router;