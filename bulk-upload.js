/**
 * @swagger
 * /bulk-upload:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Upload data
 *     description: |
 *       Uploads data to the database.
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
 *         description: The email address of the user uploading the data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userData:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: The username of the user uploading the data.
 *                   orgID:
 *                     type: integer
 *                     description: The ID of the organization.
 *                   email:
 *                     type: string
 *                     format: email
 *                     description: The email address of the user uploading the data.
 *                   roleID:
 *                     type: integer
 *                     description: The role ID of the user uploading the data.
 *                   userId:
 *                     type: integer
 *                     description: The user ID.
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   description: |
 *                     An object representing the data to be uploaded. Each key-value pair represents a column and its corresponding value.
 *     responses:
 *       '200':
 *         description: Data uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the data has been uploaded successfully.
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
const bodyParser = require('body-parser');
const moment = require('moment');
const { columnMap } = require('./Objects');

router.post('/', bodyParser.json(), async (req, res) => {
  const { userData, data } = req.body; 
  const { username, orgID, email, roleID, userId } = userData; // Add roleID to the destructured object

  // Validate headers
  const sessionId = req.header('Session-ID'); 
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }

  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }
  
  if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Fetch Org_ID corresponding to the organization name
    // const [orgResult] = await connection.query('SELECT org_ID FROM organization WHERE org_name = ?', [organization]);
    // const orgID = orgResult[0] ? orgResult[0].org_ID : null;

    // if (!orgID) {
    //   throw new Error('Organization not found');
    // }

    const insertPromises = [];
    for (const row of data) {

    const values = [orgID, username, roleID, ...Object.values(row).map(value => typeof value === 'string' ? value.replace(/ /g, '') : value)];
      const columns = ['Org_ID', 'UserName', 'Role_ID', ...Object.keys(row).map(key => columnMap[key])];
    
      const placeholders = values.map(() => '?').join(', '); 
      const query1 = 'INSERT INTO portfolio_companies_format (' + columns.join(', ') + ') VALUES (' + placeholders + ')'; 
      await connection.query(query1, values); 


      const auditLogValues = {
        Org_Id: orgID,
        ModifiedBy: userId,
        UserAction: 'Insert',
        ...Object.entries(row).reduce((acc, [key, value]) => {
          const columnName = columnMap[key] || key;
          acc[columnName] = value;
          return acc;
      }, {})
      };
      
    insertPromises.push(connection.query('INSERT INTO portfolio_audit SET ?', auditLogValues));
  }
    
    await Promise.all(insertPromises);
    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ message: 'Error inserting data' });
  }
});

module.exports = router;
