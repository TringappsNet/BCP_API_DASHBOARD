const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const bodyParser = require('body-parser');

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: User's invite token
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         phoneNo:
 *           type: string
 *           description: User's phone number
 *         password:
 *           type: string
 *           description: User's password
 *       required:
 *         - token
 *         - firstName
 *         - lastName
 *         - phoneNo
 *         - password
 *       example:
 *         token: abc123
 *         firstName: John
 *         lastName: Doe
 *         phoneNo: +1234567890
 *         password: secretPassword
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Message indicating successful registration or update
 *       required:
 *         - message
 *       example:
 *         message: User registered or updated successfully
 */

/**
 * @swagger
 * /register:
 *   post:
 *     tags: 
 *       - 'Portfolio'
 *     summary: Register or update user
 *     description: Registers or updates a user with the provided information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Invalid request or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   description: Object containing validation errors
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   description: Object containing error message
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 */

router.post('/', bodyParser.json(), async (req, res) => {
  const { token, firstName, lastName, phoneNo, password } = req.body;

  if (!token || !firstName || !lastName || !phoneNo || !password) {
    return res.status(400).json({ errors: {
        token: 'Token is required',
        firstName: 'First name is required',
        lastName: 'Last name is required',
        phoneNo: 'Phone number is required',  
        password: 'Password is required'
      }});
  }

  if (password.length < 6) {
    return res.status(400).json({ errors: { password: 'Password must be at least 6 characters long' } });
  }

  try {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    pool.query('SELECT * FROM users WHERE InviteToken = ?', [token], (error, results) => {
      if (error) {
        console.error("Error executing query:", error);
        return res.status(500).json({ message: 'Error querying database' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ errors: { token: 'User not found' } });
      }

      pool.query('CALL RegisterUser(?, ?, ?, ?, ?, ?)', [token, firstName, lastName, phoneNo, passwordHash, salt], (error) => {
        if (error) {
          console.error("Error executing stored procedure:", error);
          return res.status(500).json({ message: 'Error executing stored procedure' });
        }

        pool.query('UPDATE users SET InviteToken = NULL, isActive = 1 WHERE InviteToken = ?', [token], (error) => {
          if (error) {
            console.error("Error updating user:", error);
            return res.status(500).json({ message: 'Error updating user' });
          }

          console.log("User registered or updated successfully!");
          res.status(201).json({ message: 'User registered or updated successfully' });
        });
      });
    });
  } catch (error) {
    console.error("Error registering or updating user:", error);
    res.status(500).json({ message: 'Error registering or updating user' });
  }
});

module.exports = router;
