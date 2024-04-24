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



const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../utils/pool');
const bodyParser = require('body-parser');
const {successMessages} = require('../../utils/successMessages');
const {errorMessages} = require('../../utils/errorMessages');


router.post('/', bodyParser.json(), async (req, res) => {
  const { token, firstName, lastName, phoneNo, password } = req.body;

  // Validate required fields
  if (!token || !firstName || !lastName || !phoneNo || !password) {
    return res.status(400).json({ errors: {
        token: errorMessages.TOKEN_REQUIRED,
        firstName: errorMessages.FIRST_NAME_REQUIRED,
        lastName: errorMessages.LAST_NAME_REQUIRED,
        phoneNo: errorMessages.PHONE_NO_REQUIRED,  
        password: errorMessages.PASSWORD_LENGTH
      }});
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ errors: { password: errorMessages.PASSWORD_LENGTH } });
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt();
    // Generate password hash with the generated salt
    const passwordHash = await bcrypt.hash(password, salt);
    // Check if the user exists
    const selectUserQuery = 'SELECT * FROM users WHERE InviteToken = ?';
    const [userRows] = await pool.query(selectUserQuery, [token]);
    
    if (userRows.length === 0) {
      return res.status(404).json({ errors: { token: errorMessages.USER_NOT_FOUND } });
    }

    // Call the stored procedure to update or insert user data, including the salt
    await pool.query('CALL RegisterUser(?, ?, ?, ?, ?, ?)', [token, firstName, lastName, phoneNo, passwordHash, salt]);

    // Remove the token from the database
    await pool.query('UPDATE users SET InviteToken = NULL, isActive = 1 WHERE InviteToken = ?', [token]);

    console.log("User registered or updated successfully!");
   
    res.status(201).json({ message: successMessages.USER_REGISTERED });
  } catch (error) {
    console.error("Error registering or updating user:", error);
    res.status(500).json({ message: errorMessages.REGISTRATION_ERROR });
  }
});

module.exports = router;
