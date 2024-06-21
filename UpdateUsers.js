/**
 * @swagger
 * /Updateuser:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Update user role
 *     description: Updates the role of a user based on their email address.
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
 *               email:
 *                 type: string
 *                 description: The email address of the user whose role needs to be updated.
 *               Role:
 *                 type: string
 *                 description: The new role to assign to the user.
 *     responses:
 *       '200':
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Confirmation message indicating that the user role was updated successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating missing required parameters.
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating unauthorized access due to mismatch in email headers.
 *       '404':
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating that the specified role was not found.
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

router.post('/', (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }

  try {
    const { email, Role } = req.body;

    if (!email || !Role) {
      return res.status(400).json({ error: 'Email and Role are required in the request body' });
    }

      // // Query organization table to get org_ID
    // const [orgResult] = await pool.query('SELECT org_ID FROM organization WHERE org_name = ?', [Organization]);
    // const org_ID = orgResult.length > 0 ? orgResult[0].org_ID : null;

    const queryRole = 'SELECT role_ID FROM role WHERE role = ?';
    pool.query(queryRole, [Role], (error, roleResult) => {
      if (error) {
        console.error('Error querying role:', error);
        return res.status(500).json({ error: 'Error querying role' });
      }

      const role_ID = roleResult.length > 0 ? roleResult[0].role_ID : null;

      if (!role_ID) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const queryUpdate = 'UPDATE users SET Role_ID = ? WHERE Email = ?';
      pool.query(queryUpdate, [role_ID, email], (updateError, result) => {
        if (updateError) {
          console.error('Error updating user role:', updateError);
          return res.status(500).json({ error: 'Error updating user role' });
        }

        if (result.affectedRows === 1) {
          return res.status(200).json({ message: 'User role updated successfully' });
        } else {
          return res.status(500).json({ error: 'Failed to update user role' });
        }
      });
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Error updating user role' });
  }
});

module.exports = router;

  