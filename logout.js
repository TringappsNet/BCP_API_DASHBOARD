const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

router.get('/', (req, res) => {
    if (req.session.userID) {
      // Record the user's logout time
      pool.query(
        'CALL RecordLogoutTime(?)',
        [req.session.userID],
        (err, results, fields) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
          }
  
          // Clear the user's session information
          req.session.destroy(() => {
            res.clearCookie('sessionId');
            return res.status(200).json({ message: 'Logged Out' });
          });
        }
      );
    } else {
      return res.status(400).json({ error: 'User not logged in' });
    }
  });
module.exports = router;