const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required!' });
    }

    try {
        // Check if the user with the provided email exists
        const [rows] = await pool.query('SELECT * FROM Users WHERE Email = ?', [email]);
        if (rows.length > 0) {
            const user = rows[0];
            console.log('Hashed password from database:', user.PasswordHash);
            const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
            console.log('Is password valid:', isValidPassword);
            
            if (isValidPassword) {
                // Create a session for the user
                const sessionId = req.sessionID;
                const userId = user.UserID;
                const UserName = user.UserName;
                const Organization = user.Organization;

                const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

                console.log('Session created at:', createdAt);
                console.log('Session will expire at:', expiration);

                // Store session information in the Session table
                await pool.query('INSERT INTO Session (UserID, SessionID, CreatedAt, Expiration) VALUES (?, ?, ?, ?)', [userId, sessionId, createdAt, expiration]);

                // Set the session ID as a cookie in the response headers
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    secure: false, // Set to true if using HTTPS
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                });

                res.status(200).json({
                    message: 'Logged In',
                    UserName: UserName,
                    userId: userId,
                    email: email,
                    sessionId: sessionId,
                    Organization: Organization,
                    createdAt: createdAt, // Include createdAt in the response
                });
            } else {
                console.log('Invalid password provided');
                res.status(401).json({ message: 'Invalid Password!' });
            }
        } else {
            console.log('User not found');
            res.status(400).json({ message: 'User Not Found!' });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(500).json({ message: 'Error logging in user' });
    }
});


module.exports = router;
