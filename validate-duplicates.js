/**
 * @swagger
 * /validate-duplicates:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Validate duplicate data
 *     description: Validates duplicate data for a given user and organization.
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
 *               userData:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     description: The username
 *                   organization:
 *                     type: string
 *                     description: The organization name
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   description: Data to be validated
 *     responses:
 *       '200':
 *         description: Successfully validated duplicates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       isDuplicate:
 *                         type: boolean
 *                         description: Indicates whether the data is a duplicate or not
 *                       rowId:
 *                         type: integer
 *                         description: The ID of the duplicate row, if it exists
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating the reason for the bad request
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating the internal server error
 */

const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.post('/', async (req, res) => {
    const { userData, data } = req.body;
    const { userId, Org_ID } = userData;

    if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
      return res.status(400).json({ message: 'Invalid JSON body format' });
    }
  
    try {
      const connection = await pool.getConnection();  
      const duplicatePromises = data.map(async row => {
      const keys = Object.keys(row);  
      const mappedKeys = ['Org_ID', 'UserID', ...keys];
      const mappedValues = [Org_ID, userId, ...Object.values(row)]; 
      const monthYearIndex = mappedKeys.indexOf('MonthYear');
      const monthYearValue = monthYearIndex !== -1 ? mappedValues[monthYearIndex] : null;
      const [yearValue, monthValue] = monthYearValue ? monthYearValue.split('-') : [null, null];      
      const companyName = row['CompanyName'];
      const query = 'SELECT COUNT(*) as count FROM portfolio_companies_format WHERE CompanyName = ? AND YEAR(MonthYear) = ? AND MONTH(MonthYear) = ?';
      const result = await connection.query(query, [companyName, yearValue, monthValue]);
      const isDuplicate = result[0][0].count > 0;
    
      return {
        isDuplicate: isDuplicate,
        rowId: result[0][0].id || null,
      };
    });

    const results = await Promise.all(duplicatePromises);
    const hasDuplicates = results.some(result => result.isDuplicate); 
    res.status(200).json({ data:results, hasDuplicates }); 
    connection.release();

        } catch (error) {
          console.error('Error validating duplicates:', error);
          res.status(500).json({ message: 'Error validating duplicates' });
        }
    });

module.exports = router;

