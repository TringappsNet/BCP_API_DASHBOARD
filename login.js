const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');

router.post('/', async (req, res) => {
    const { userName, password } = req.body;
    
    try {
        const [rows] = await pool.query('CALL loginUser(?, ?, @message)', [userName, password]);
        const message = await pool.query('SELECT @message AS message');
        const result = message[0][0];
        
        if (result.message === 'Logged In') {
            // Fetch user details or session data if needed
            res.status(200).json({
                message: result.message,
                username: userName,
                organization: 'OrganizationName' // Fetch organization from session or user data
            });
        } else {
            res.status(401).json({ message: result.message });
        }
    } catch (error) {
<<<<<<< Updated upstream
      console.error("Error logging in user:", error);
      res.status(500).json({ message: 'Error logging in user' });
=======
        console.error("Error logging in user:", error);
        res.status(500).json({ error: 'Error logging in user' });
>>>>>>> Stashed changes
    }
});

module.exports = router;
