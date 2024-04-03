/**
 * @swagger
 * /delete:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Delete rows
 *     description: |
 *       Deletes rows from the database based on the provided IDs.
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

router.post('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  const email = req.header('Email'); // Extract email from request headers
  
  if (!sessionId || !emailHeader || !email) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const deletePromises = ids.map(id => {
      const query = 'DELETE FROM Portfolio_Companies_format WHERE id = ?';
      return connection.query(query, [id]);
    });

    await Promise.all(deletePromises);
    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Rows deleted successfully' });
  } catch (error) {
    console.error('Error deleting rows:', error);
    res.status(500).json({ message: 'Error deleting rows' });
  }
});

module.exports = router;
