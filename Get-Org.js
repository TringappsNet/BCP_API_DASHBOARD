/**
 * @swagger
 * /Get-Org:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Retrieve all organization names
 *     description: Retrieves a list of all organization names along with their IDs.
 *     responses:
 *       '200':
 *         description: A list of organization names and their IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   org_ID:
 *                     type: integer
 *                     description: The ID of the organization.
 *                   org_name:
 *                     type: string
 *                     description: The name of the organization.
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

// GET endpoint to retrieve all organization names
router.get('/', async (req, res) => {
    try {
        // Query the database to retrieve all organization names
        const [rows] = await pool.query('SELECT o.org_ID, o.org_name, COUNT(u.UserID) AS user_count FROM organization o LEFT JOIN users u ON o.org_ID = u.Org_ID GROUP BY o.org_ID, o.org_name');

        // Send back the array of organization names
        res.status(200).json(rows);
    } catch (error) {
        // If an error occurs, send a 500 Internal Server Error response
        console.error('Error retrieving organization names:', error);
        res.status(500).json({ error: 'Error retrieving organization names' });
    }
});

module.exports = router;
