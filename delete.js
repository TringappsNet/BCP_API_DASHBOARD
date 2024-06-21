/**
 * @swagger
 * /delete:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Delete rows
 *     description: |
 *       Deletes rows from the database based on the provided IDs.
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
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: An array of IDs of the rows to be deleted.
 *               Org_Id:
 *                 type: integer
 *                 description: The ID of the organization.
 *               userId:
 *                 type: integer
 *                 description: The ID of the user making the request.
 *     responses:
 *       '200':
 *         description: Rows deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the rows have been deleted successfully.
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating a bad request, such as missing or invalid input data.
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating unauthorized access due to mismatched email headers.
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
const pool = require('./pool');
const { columnMap } = require('./Objects');

router.post('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');

  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }

  // You may want to validate sessionId against your session data in the database

  const { ids, Org_Id, userId } = req.body;

  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const deletePromises = ids.map(async id => {
        const [deletedRow] = await connection.query('SELECT * FROM portfolio_companies_format WHERE id = ?', [id]);

        if (!deletedRow || !deletedRow.length) {
          return;
        }

        const query = 'DELETE FROM portfolio_companies_format WHERE id = ?';
        await connection.query(query, [id]);

        const { ID, UserName, Role_ID, Org_ID, UserID, ...modifiedDeletedRow } = deletedRow[0];
        const auditLogValues = {
          Org_Id: Org_Id,
          ModifiedBy: userId,
          UserAction: 'Delete',
          ...Object.entries(modifiedDeletedRow).reduce((acc, [key, value]) => {
            const columnName = columnMap[key] || key;
            acc[columnName] = value;
            return acc;
          }, {})
        };

        // Insert audit log
        await connection.query('INSERT INTO portfolio_audit SET ?', auditLogValues);
      });

      await Promise.all(deletePromises);
      await connection.commit();
      res.status(200).json({ message: 'Rows deleted successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting rows:', error);
      res.status(500).json({ message: 'Error deleting rows' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting connection from pool:', error);
    res.status(500).json({ message: 'Error deleting rows' });
  }
});

module.exports = router;
