/**
 * @swagger
 * /Get-Role:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Retrieve all roles
 *     description: Retrieves a list of all roles.
 *     responses:
 *       '200':
 *         description: A list of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   role_ID:
 *                     type: integer
 *                     description: The ID of the role.
 *                   role:
 *                     type: string
 *                     description: The name of the role.
 *                   description:
 *                     type: string
 *                     description: Description of the role.
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

// GET endpoint to retrieve all roles
router.get('/', (req, res) => {
    try {
        // Query the database to retrieve all roles
        pool.query('SELECT * FROM role', (error, results) => {
            if (error) {
                console.error('Error retrieving roles:', error);
                return res.status(500).json({ error: 'Error retrieving roles' });
            }

            // Send back the array of roles
            res.status(200).json(results);
        });
    } catch (error) {
        // If an error occurs, send a 500 Internal Server Error response
        console.error('Error retrieving roles:', error);
        res.status(500).json({ error: 'Error retrieving roles' });
    }
});

module.exports = router;
