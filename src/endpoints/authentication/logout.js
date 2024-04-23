const express = require('express');
const router = express.Router();
const pool = require('../../utils/pool');

/**
 * @swagger
 * /logout:
 *   post:
 *     tags: ['Authentication']
 *     summary: Logs out the user
 *     description: Logs out the user and destroys the session.
 *     responses:
 *       '200':
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating successful logout
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

router.post('/', async (req, res) => {
    try {
        // Clear the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ error: 'Failed to logout!' });
            } else {
                return res.status(200).json({ message: 'Logged out successfully' });
            }
        });
    } catch (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ error: 'Failed to logout!' });
    }
});

module.exports = router;
