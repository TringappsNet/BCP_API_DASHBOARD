/**
 * @swagger
 * /users-Active:
 *   put:
 *     tags: ['Portfolio']
 *     summary: Update user isActive status by email
 *     description: Updates the isActive status of a user by their email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email of the user to update.
 *               isActive:
 *                 type: boolean
 *                 description: The new isActive status for the user.
 *     parameters:
 *       - in: body
 *         name: email
 *         description: The email of the user to update.
 *         required: true
 *         schema:
 *           type: string
 *       - in: body
 *         name: isActive
 *         description: The new isActive status for the user.
 *         required: true
 *         schema:
 *           type: boolean
 *     responses:
 *       '200':
 *         description: User isActive status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the user's isActive status was updated.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the email or isActive parameter is missing.
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the user was not found.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating an internal server error.
 */

const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.put('/', async (req, res) => {
    const { email, isActive } = req.body;

    try {
        // Check if email and isActive are provided
        if (!email || isActive === undefined || isActive === null) {
            return res.status(400).json({ error: 'Email and isActive parameter are required!' });
        }

        // Execute SQL query to update isActive column
        const result = await pool.query('UPDATE users SET isActive = ? WHERE Email = ?', [isActive, email]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'User isActive status updated successfully' });
    } catch (error) {
        console.error("Error updating user isActive status:", error);
        return res.status(500).json({ error: 'Error updating user isActive status' });
    }
});

module.exports = router;
