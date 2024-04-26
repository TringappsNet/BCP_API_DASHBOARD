/**
 * @swagger
 * /update-Org:
 *   put:
 *     tags: 
 *       - 'Portfolio'
 *     summary: Update organization name by ID
 *     description: Updates the name of an organization by its ID.
 *     parameters:
 *       - in: header
 *         name: Session-ID
 *         description: The session ID of the user.
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Email
 *         description: The email address of the user.
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *          application/json:
 *            schema:
 *               type: object
 *               properties:
 *                  ord_id:
 *                      type: integer
 *                      description: The ID of the organization to update
 *                  new_org_name:
 *                      type: string
 *                      descrption: The new name for the organization.    
 *     responses:
 *       '200':
 *         description: Organization name updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the organization name was updated.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the organization ID or new name is missing.
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

router.put('/', async (req, res) => {
    const { org_id, new_org_name } = req.body;

    try {
        // Check if org_id and new_org_name are provided
        if (!org_id || !new_org_name) {
            return res.status(400).json({ error: 'Organization ID and new organization name are required!' });
        }

        // Execute SQL query to update org_name
        const result = await pool.query('UPDATE organization SET org_name = ? WHERE org_ID = ?', [new_org_name, org_id]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organization not found!' });
        }

        // Send success response
        return res.status(200).json({ message: 'Organization name updated successfully' });
    } catch (error) {
        console.error("Error updating organization name:", error);
        return res.status(500).json({ error: 'Error updating organization name' });
    }
});

module.exports = router;
