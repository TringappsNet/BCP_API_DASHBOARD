const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');

router.post('/', async (req, res) => {
    const { email, password } = req.body;

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
                let sessionId;
                // Check if the user already has a session
                const [sessionRows] = await pool.query('SELECT * FROM Session WHERE UserID = ?', [user.UserID]);
                if (sessionRows.length > 0) {
                    // User has an existing session, use that session ID
                    sessionId = sessionRows[0].SessionID;
                } else {
                    // User doesn't have a session, create a new session ID
                    sessionId = req.sessionID;
                    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

                    await pool.query('INSERT INTO Session (UserID, SessionID, CreatedAt, Expiration) VALUES (?, ?, ?, ?)', [user.UserID, sessionId, createdAt, expiration]);
                }

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
                    userId: user.UserID,
                    email: email,
                    sessionId: sessionId
                });
            } else {
                // Invalid password
                return res.status(401).json({ message: 'Invalid Password!' });
            }
        } else {
            // User not found
            return res.status(400).json({ message: 'User Not Found!' });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ message: 'Error logging in user' });
    }
});

module.exports = router;
