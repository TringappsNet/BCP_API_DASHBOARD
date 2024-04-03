const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const { emailRegex } = require('./Objects');

router.post('/', async (req, res) => {
    const { email, password } = req.body;
  
    try {
        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address!' });
        }

        // Retrieve user information from the database including organization name
        const [rows] = await pool.query(`
            SELECT u.*, o.org_name AS OrganizationName
            FROM users u
            LEFT JOIN organization o ON u.Org_ID = o.org_ID
            WHERE Email = ?`, [email]);
        
        // Check if the user exists
        if (rows.length > 0) {
            const user = rows[0];
            const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
            if (isValidPassword) {
                // Generate session details
                const sessionId = req.sessionID;
                const userId = user.UserID;
                const UserName = user.UserName;
                const Organization = user.OrganizationName;
                const Role_ID = user.Role_ID; 
                const Org_ID=user.Org_ID;
                const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
                await pool.query('UPDATE users SET CurrentSessionID = ?, LastLoginTime = ? WHERE Email = ?', [sessionId, createdAt, email]);

                // Set session cookie
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    secure: false,
                    maxAge: 10 * 60 * 1000
                });

                // Respond with user information and session details
                return res.status(200).json({
                    message: 'Logged In',
                    UserName: UserName,
                    userId: userId,
                    email: email,
                    sessionId: sessionId,
                    Organization: Organization,
                    Role_ID: Role_ID,
                     Org_ID:Org_ID

                });
            } else {
                // Invalid password
                return res.status(401).json({ error: 'Invalid Password!' });
            }
        } else {
            // User not found
            return res.status(400).json({ error: 'User Not Found!' });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ error: 'Error logging in user' });
    }
});

module.exports = router;
