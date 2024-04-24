/**
 * @swagger
 * /reset-new:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Reset user password
 *     description: Reset the user's password by verifying the old password and updating it with a new one.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address of the user.
 *               oldPassword:
 *                 type: string
 *                 description: The old password of the user.
 *               newPassword:
 *                 type: string
 *                 description: The new password to be set for the user.
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the password has been reset successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the email, old password, or new password are missing.
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the old password provided is invalid.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating an internal server error.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../../utils/pool');
const {successMessages} = require('../../utils/successMessages');
const {errorMessages} = require('../../utils/errorMessages');


router.post('/', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  // Check if old password and new password are provided
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: errorMessages.MISSING_FIELDS });
  }

  try {
    // Check if the user exists in the database
    const [rows] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: errorMessages.USER_NOT_FOUND });
    }

    const user = rows[0]; // Extract the first row from the result

    // Validate the old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.PasswordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: errorMessages.INVALID_OLD_PASSWORD });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password in the database using the user's ID
    const updateQuery = 'UPDATE users SET PasswordHash = ?, Salt = ? WHERE UserID = ?';
    await pool.query(updateQuery, [newPasswordHash, salt, user.UserID]);

    console.log("Password reset successfully!");
    res.status(200).json({ message: successMessages.PASSWORD_RESET });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: errorMessages.RESET_ERROR });
  }
});

module.exports = router;
