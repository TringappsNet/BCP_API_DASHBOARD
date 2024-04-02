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
        const [rows] = await pool.query(`
        SELECT u.*, o.org_name AS OrganizationName
        FROM users u
        LEFT JOIN organization o ON u.Org_ID = o.org_ID
        WHERE Email = ?`, [email]);
      
      if (rows.length > 0) {
        const user = rows[0];
        const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
  
        if (isValidPassword) {
          const sessionId = req.sessionID;
          const userId = user.UserID;
          const UserName = user.UserName
          const Organization = user.OrganizationName
  
          const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  
          await pool.query('INSERT INTO Session (UserID, SessionID, CreatedAt, Expiration) VALUES (?, ?, ?, ?)', [userId, sessionId, createdAt, expiration]);
  
          res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: false,
            maxAge: 10 * 60 * 1000
          });
  
          res.status(200).json({
            message: 'Logged In',
            UserName: UserName,
            userId: userId,
            email: email,
            sessionId: sessionId,
            Organization: Organization
          });
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