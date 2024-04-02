const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');
const { emailRegex } = require('./Objects')

router.post('/', async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required!' });
    }
  
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address!' });
    }
  
    try {

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        // Retrieve user information from the database
        const [rows] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);

        // Check if the user exists and the password is correct
        if (rows.length > 0) {
            const user = rows[0];
            const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
            if (isValidPassword) {
                // Check session status
                const [sessionRows] = await pool.query('SELECT * FROM Session WHERE UserID = ?', [user.UserID]);
                if (sessionRows.length > 0) {
                    sessionId = sessionRows[0].SessionID;
                    const session = sessionRows[0];
                    const expirationTime = new Date(session.Expiration).getTime();
                    const currentTime = Date.now();
                    if (currentTime > expirationTime) {
                        // Session has expired
                        return res.status(401).json({ message: 'Session has expired. Please log in again.' });
                    }
                } else {
                    // Session not found
                    return res.status(401).json({ message: 'Session not found. Please log in again.' });
                }

                // Create or update session
                const sessionId = req.sessionID;
                const userId = user.UserID;
                const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

                await pool.query('INSERT INTO Session (UserID, SessionID, CreatedAt, Expiration) VALUES (?, ?, ?, ?)', [userId, sessionId, createdAt, expiration]);

                // Set session cookie
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    secure: false,
                    maxAge: 24 * 60 * 60 * 1000
                });

                // Respond with user information and session details
                return res.status(200).json({
                    message: 'Logged In',
                    UserName: user.UserName,
                    userId: userId,
                    email: email,
                    sessionId: sessionId,
                    createdAt: createdAt
                });
            } else {
                // Invalid password
                return res.status(401).json({ message: 'Invalid Password!' });
            }

        } else {
          res.status(401).json({ error: 'Invalid Password!' });
        }
      } else {
        res.status(400).json({ error: 'User Not Found!' });
      }
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ error: 'Error logging in user' });
    }
  });
  

module.exports = router;