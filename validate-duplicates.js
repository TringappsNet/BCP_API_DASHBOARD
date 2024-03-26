const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');

const checkForDuplicates = async (organization, username, monthYear) => {
    const connection = await pool.getConnection();
    const query = 'SELECT COUNT(*) as count FROM Portfolio_Companies_format WHERE Organization = ? AND UserName = ? AND MonthYear = ?';
    const formattedMonthYear = moment(monthYear).format('YYYY-MM-DD HH:mm:ss');
    const [rows] = await connection.query(query, [organization, username, formattedMonthYear]);
    connection.release();
    return rows[0].count > 0;
  };

// Add a parseMonthYear function to parse the date from the request
const parseMonthYear = row => {
  const dateString = row['Month/Year'];
  const dateParts = dateString.split('-');
  return {
    year: parseInt(dateParts[0]),
    month: parseInt(dateParts[1])
  };
};

// Update the handler function to insert the data
router.post('/', bodyParser.json(), async (req, res) => {
  const { userData, data } = req.body;
  const { username, organization } = userData;

  if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  const parsedData = data.map(row => {
    const parsedMonthYear = parseMonthYear(row);
    return {
      ...row,
      MonthYear: moment({ year: parsedMonthYear.year, month: parsedMonthYear.month, day: 15 }),
      Organization: organization,
      UserName: username,
    };
  });

  const duplicatePromises = parsedData.map(async row => {
    const isDuplicate = await checkForDuplicates(organization, username, row.MonthYear);
    return { ...row, isDuplicate };
  });

  const validatedData = await Promise.all(duplicatePromises);
  res.status(200).json(validatedData);
});

module.exports = router;