const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

/**
 * @swagger
 * /logout:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Logout user
 *     description: Logs out the currently logged-in user.
 *     responses:
 *       '200':
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating successful logout
 *       '400':
 *         description: User not logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 */

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