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

  if (!Array.isArray(data) || !data.every((item) => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();

    // Prepare the batch query
    const queryParts = [];
    const queryValues = [];
    const distinctCompanyNames = [
      ...new Set(data.map((row) => row['CompanyName'])),
    ];
    data.forEach((row, index) => {
      const monthYearValue = row['MonthYear'];
      const [yearValue, monthValue] = monthYearValue
        ? monthYearValue.split('-')
        : [null, null];
      const companyName = row['CompanyName'];

      queryParts.push(
        `(CompanyName = ? AND YEAR(MonthYear) = ? AND MONTH(MonthYear) = ?)`
      );
      queryValues.push(companyName, yearValue, monthValue);
    });
    const [organizations] = await pool.query('SELECT * FROM organization');
    // Check if each company name exists in the organization names
    const companyExistence = distinctCompanyNames.map((companyName) => {
      const exists = organizations.some((org) => org.org_name === companyName);
      return { companyName, exists: exists ? 1 : 0 };
    });
    const allCompaniesFound = companyExistence.every(
      (company) => company.exists === 1
    );
    if (!allCompaniesFound) {
      const missingCompanies = companyExistence
        .filter((company) => company.exists === 0)
        .map((company) => company.companyName);

      const missingCompaniesString = missingCompanies.join(', ');
      const message = `Invalid Organization(s). The following need to be added: ${missingCompaniesString}`;
      return res.status(404).json({ message: message });
    }
    const validationQuery = `
      SELECT CompanyName, YEAR(MonthYear) as year, MONTH(MonthYear) as month, COUNT(*) as count, ANY_VALUE(id) as id
      FROM portfolio_companies_format
      WHERE ${queryParts.join(' OR ')}
      GROUP BY CompanyName, year, month
    `;

    const [validationResults] = await connection.query(
      validationQuery,
      queryValues
    );

    // Map the results to the original data
    const results = data.map((row) => {
      const monthYearValue = row['MonthYear'];
      const [yearValue, monthValue] = monthYearValue
        ? monthYearValue.split('-')
        : [null, null];
      const companyName = row['CompanyName'];

      const result = validationResults.find(
        (res) =>
          res.CompanyName === companyName &&
          res.year == yearValue &&
          res.month == monthValue
      );

      return {
        isDuplicate: result ? result.count > 0 : false,
        rowId: result ? result.id : null,
      };
    });

    const hasDuplicates = results.some((result) => result.isDuplicate);
    res.status(200).json({ data: results, hasDuplicates });
    connection.release();
  } catch (error) {
    console.error('Error validating duplicates:', error);
    res.status(500).json({ message: 'Error validating duplicates' });
  }
});

module.exports = router;
