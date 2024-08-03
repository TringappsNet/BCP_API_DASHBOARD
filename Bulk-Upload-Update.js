const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');

/**
 * @swagger
 * /bulk-upload-update:
 *   post:
 *     tags: ['Portfolio']
 *     summary: Upload or update data
 *     description: |
 *       Uploads or updates data to the database.
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
 *                     An array of objects representing the data to be uploaded or updated. Each object represents a row of data to be inserted or updated in the database.
 *     responses:
 *       '200':
 *         description: Data uploaded or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating that the data has been uploaded or updated successfully.
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
 *       '403':
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the user does not have permission to upload data for the specified organization.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating an internal server error or unsupported Excel format.
 */

router.post('/', bodyParser.json(), async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');

  if (!sessionId || !emailHeader) {
    return res
      .status(400)
      .json({ message: 'Session ID and Email headers are required!' });
  }

  const { userData, data } = req.body;
  const { username, orgID, email, roleID, userId } = userData;

  if (email !== emailHeader) {
    return res.status(401).json({
      message: 'Unauthorized: Email header does not match user data!',
    });
  }

  if (!Array.isArray(data) || !data.every((item) => typeof item === 'object')) {
    return res
      .status(400)
      .json({ message: 'Invalid JSON body format for new data' });
  }

  try {
    // const startTime = new Date();
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orgResult] = await connection.query(
      'SELECT org_name FROM organization WHERE org_ID = ?',
      [orgID]
    );
    // console.log(data);
    if (
      roleID !== '1' &&
      data.some(
        (item) =>
          item.CompanyName.toLowerCase().replace(/\s/g, '') !==
          orgResult[0].org_name.toLowerCase().trim().replace(/\s/g, '')
      )
    ) {
      return res.status(403).json({
        message: "You don't have permission to upload from this Organization",
      });
    }
    const updateValues = [];
    const insertValues = [];
    const insertPromises = [];
    // console.log('data', data.slice(0, 5));
    selectstmt = `SELECT ID, Org_ID, UserName, MonthYear,
      CompanyName,
      RevenueActual,
      RevenueBudget,
      GrossProfitActual,
      GrossProfitBudget,
      SGAActual,
      SGABudget,
      EBITDAActual,
      EBITDABudget,
      CapExActual,
      CapExBudget,
      FixedAssetsNetActual,
      FixedAssetsNetBudget,
      CashActual,
      CashBudget,
      TotalDebtActual,
      TotalDebtBudget,
      AccountsReceivableActual,
      AccountsReceivableBudget,
      AccountsPayableActual,
      AccountsPayableBudget,
      InventoryActual,
      InventoryBudget,
      EmployeesActual,
      EmployeesBudget FROM bcp.portfolio_companies_format;`;
    const [existingRows] = await connection.query(selectstmt);
    const objectsAreDifferent = (obj1, obj2, excludeKeys) => {
      const keys1 = Object.keys(obj1).filter(
        (key) => !excludeKeys.includes(key)
      );
      const keys2 = Object.keys(obj2).filter(
        (key) => !excludeKeys.includes(key)
      );

      if (keys1.length !== keys2.length) return true;

      for (let key of keys1) {
        // console.log(key)
        if (obj1[key] !== obj2[key]) {
          // console.log(obj1[key], obj2[key]);
          return true;
        }
      }

      return false;
    };

    for (const newData of data) {
      const monthYear = new Date(newData['MonthYear']).toLocaleDateString();
      const companyName = newData['CompanyName'];
      const existingRow = existingRows.filter(
        (row) =>
          row.MonthYear.toLocaleDateString() === monthYear &&
          row.CompanyName === companyName
      );

      if (existingRow.length > 0) {
        // Update existing row
        const excludeColumns = [
          'ID',
          'Org_ID',
          'UserName',
          'MonthYear',
          'CompanyName',
        ];
        if (objectsAreDifferent(existingRow[0], newData, excludeColumns)) {
          const updateValue = {
            ...newData,
            ID: existingRow[0].ID,
            UserName: existingRow[0].UserName,
          };
          updateValues.push(updateValue);
          const auditLogValuesUpdate = {
            Org_Id: orgID,
            ModifiedBy: userId,
            UserAction: 'Overridden',
            ...Object.entries(newData).reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {}),
          };
          insertPromises.push(
            connection.query(
              'INSERT INTO portfolio_audit SET ?',
              auditLogValuesUpdate
            )
          );
        }
      } else {
        // Insert new row
        const insertValue = {
          Org_ID: orgID,
          UserName: username,
          ...newData,
        };
        insertValues.push(insertValue);
        const auditLogValuesInsert = {
          Org_Id: orgID,
          ModifiedBy: userId,
          UserAction: 'Insert',
          ...Object.entries(newData).reduce((acc, [key, value]) => {
            // const columnName = columnMap[key] || key;
            acc[key] = value;
            return acc;
          }, {}),
        };
        insertPromises.push(
          connection.query(
            'INSERT INTO portfolio_audit SET ?',
            auditLogValuesInsert
          )
        );
      }
      // console.log('newData', newData);
    }
    console.log('updateValues', updateValues.length);
    console.log('insertValues', insertValues.length);

    // console.log(
    //   'Before insert and update Duration: ',
    //   (new Date() - startTime) / 60000
    // );

    // Bulk update
    if (updateValues.length > 0) {
      // Get all column names except 'ID'
      const columns = Object.keys(updateValues[0]).filter(
        (col) => col !== 'ID'
      );

      // Construct the query
      let query = `INSERT INTO portfolio_companies_format (ID, ${columns.join(
        ', '
      )}) VALUES `;

      // Create placeholders for all rows
      const placeholders = updateValues
        .map(() => `(${['?', ...columns.map(() => '?')].join(', ')})`)
        .join(', ');

      query += placeholders;

      // Add ON DUPLICATE KEY UPDATE clause
      query +=
        ' ON DUPLICATE KEY UPDATE ' +
        columns.map((col) => `${col} = VALUES(${col})`).join(', ');

      // Flatten all values into a single array
      const values = updateValues.flatMap((obj) => [
        obj.ID,
        ...columns.map((col) => obj[col]),
      ]);
      const [result] = await connection.query(query, values);
      console.log(`Updated ${result.affectedRows} rows`);
    }

    // Bulk insert
    if (insertValues.length > 0) {
      // Get column names from the first object
      const columns = Object.keys(insertValues[0]);

      // Create the base query
      let query = `INSERT INTO portfolio_companies_format (${columns.join(
        ', '
      )}) VALUES `;

      // Create placeholders for all rows
      const placeholders = insertValues
        .map(() => `(${columns.map(() => '?').join(', ')})`)
        .join(', ');

      query += placeholders;

      // Flatten all values into a single array
      const values = insertValues.flatMap((obj) =>
        columns.map((col) => obj[col])
      );
      const [result] = await connection.query(query, values);
      console.log(`Inserted ${result.affectedRows} rows`);
    }

    // console.log('Duration: ', (new Date() - startTime) / 60000);
    // Execute all insert promises
    await Promise.all(insertPromises);
    // const endTime = new Date();
    // const diffInMs = endTime - startTime;
    // const diffInMinutes = diffInMs / 60000;
    // console.log('Duration: ', diffInMinutes);
    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error inserting/updating data:', error);
    res.status(500).json({ message: 'Try Upload later' });
  }
});

module.exports = router;
