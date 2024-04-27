/**
 * @swagger
 * /update:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Update a row
 *     description: |
 *       Update a row in the database based on the provided data.
 *     parameters:
 *       - in: header
 *         name: Session-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID of the user.
 *       - in: header
 *         name: email
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
 *               email:
 *                 type: string
 *                 description: The email of the user making the request.
 *               userId:
 *                 type: integer
 *                 description: The ID of the user making the request.
 *               Org_ID:
 *                 type: integer
 *                 description: The ID of the organization.
 *               editedRow:
 *                 type: object
 *                 description: The edited row data.
 *     responses:
 *       '200':
 *         description: Row updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the row has been updated successfully.
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
 *         description: UNAUTHORIZED
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating UNAUTHORIZED access due to mismatched email headers.
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
const bodyParser = require('body-parser');
const updatedRow = require('./middlewares/updated-row');
const { columnMap } = require('./Objects');


router.use(bodyParser.json());

router.post('/', updatedRow, async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('email');
  const email=req.body.email;
  const userId=req.body.userId;
  const Org_ID=req.body.Org_ID;

  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }
  const { editedRow } = req.body;

  if (!editedRow || !editedRow.ID) {
    return res.status(400).json({ message: 'Invalid request or missing ID' });
  }

  try {
    // Convert the Quarter value to a number if necessary
    if (editedRow.Quarter) {
      editedRow.Quarter = parseInt(editedRow.Quarter.replace('Q', ''), 10);
    }

    // Construct set statements and values array
    const setStatements = [];
    const values = [];

    Object.entries(editedRow).forEach(([key, value]) => {
      // Skip ID field and null values
      if (key !== 'ID' && value !== null) {
        setStatements.push(`${key} = ?`);
        values.push(value);
      }
    });

    // Add ID value at the end
    values.push(editedRow.ID);

    // Construct SQL query
    const query = `UPDATE portfolio_companies_format SET ${setStatements.join(', ')} WHERE ID = ?`;

    // Execute the query
    const [result] = await pool.query(query, values);

    if (result.affectedRows > 0) {
      const { ID, ...auditLogValuesWithoutID } = editedRow;
      const auditLogValues = {
        Org_Id: Org_ID,
        ModifiedBy: userId,
        UserAction: 'Update',
        ...Object.entries(auditLogValuesWithoutID).reduce((acc, [key, value]) => {
          const columnName = columnMap[key] || key;
          acc[columnName] = value;
          return acc;
        }, {})
      };
      // Insert audit log
      await pool.query('INSERT INTO portfolio_audit SET ?', auditLogValues);

      res.status(200).json({ message: 'Row updated successfully' });
    } else {
      res.status(200).json({ message: 'No changes made to the row' });
    }
  } catch (error) {
    console.error('Error updating row:', error);
    res.status(500).json({ message: 'Error updating row' });
  }
});

module.exports = router;
