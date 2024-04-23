/**
 * @swagger
 * /create-org:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Create organization
 *     description: Creates a new organization.
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
 *           format: email
 *         description: The email address of the user making the request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               org_name:
 *                 type: string
 *                 description: The name of the organization to be created
 *     responses:
 *       '201':
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating success
 *                 org_ID:
 *                   type: integer
 *                   description: The ID of the newly created organization
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

// POST endpoint to create organization
router.post('/', async (req, res) => {
    try {
        // Extract organization name from request body
        const { org_name } = req.body;

        // Check if organization name is provided
        if (!org_name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // Check if organization already exists
        const [existingOrg] = await pool.query('SELECT * FROM organization WHERE org_name = ?', [org_name]);
        if (existingOrg.length > 0) {
            return res.status(400).json({ error: 'Organization already exists' });
        }

        // Insert the organization into the database
        const result = await pool.query('INSERT INTO organization (org_name) VALUES (?)', [org_name]);

        // Send success response
        res.status(201).json({ message: 'Organization created successfully', org_ID: result.insertId });
    } catch (error) {
        console.error('Error creating organization:', error);
        return res.status(500).json({ error: 'Error creating organization' });
    }
});

module.exports = router;
