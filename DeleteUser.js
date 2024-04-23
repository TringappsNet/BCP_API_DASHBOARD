/**
 * @swagger
 * /Deleteuser:
 *   delete:
 *     tags: ['Portfolio']
 *     summary: Delete user by UserID
 *     description: Deletes a user by their UserID.
 *     parameters:
 *       - in: header
 *         name: Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID of the user.
 *       - in: header
 *         name: Email
 *         required: true
 *         schema:
 *           type: string
 *         description: The email address of the user making the request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userID:
 *                 type: integer
 *                 description: The ID of the user to be deleted
 *     responses:
 *       '200':
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating success
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the user was not found
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the reason for the bad request
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the internal server error
 */

const express = require('express');
const router = express.Router();
const pool = require('./pool');

// DELETE endpoint to delete a user by UserID
router.delete('/', async (req, res) => {
    try {
        // Extract UserID from request body
        const { userID } = req.body;

        // Check if userID is provided
        if (!userID) {
            return res.status(400).json({ error: 'UserID is required in the request body' });
        }

        // Call the stored procedure or SQL query to delete the user
        const result = await pool.query('DELETE FROM users WHERE UserID = ?', [userID]);

        // Check if the user was deleted successfully
        if (result.affectedRows === 1) {
            return res.status(200).json({ message: 'User deleted successfully' });
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ error: 'Error deleting user' });
    }
});

module.exports = router;
