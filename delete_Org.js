/**
 * @swagger
 * /delete-Org:
 *   delete:
 *     tags: ['Portfolio']
 *     summary: Delete organization by ID
 *     description: Deletes an organization by its ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               org_ID:
 *                 type: integer
 *                 description: The ID of the organization to be deleted.
 *     parameters:
 *       - in: body
 *         name: org_ID
 *         description: The ID of the organization to be deleted.
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the organization was deleted.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the organization ID is missing.
 *       '404':
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the organization was not found.
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

router.delete('/', async (req, res) => {
    const { org_ID } = req.body;

    try {
        // Check if org_ID is provided
        if (!org_ID) {
            return res.status(400).json({ error: 'Organization ID is required!' });
        }

        // Execute SQL query to delete organization
        const result = await pool.query('DELETE FROM organization WHERE org_ID = ?', [org_ID]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organization not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error("Error deleting organization:", error);
        return res.status(500).json({ error: 'Error deleting organization' });
    }
});

module.exports = router;
