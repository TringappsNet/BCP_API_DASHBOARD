const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');
const columnMap = require('./column-map');
const checkForDuplicates = require('./validate-duplicates');

router.post('/', bodyParser.json(), async (req, res) => {
  const { userData, overrideExisting, newDatas } = req.body;
  const { username, organization } = userData;

  if (!Array.isArray(newDatas) || !newDatas.every(item => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format for new data' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const columns = ['Organization', 'UserName', ...Object.keys(newDatas[0]).map(key => columnMap[key])];

    // Function to format datetime values
    const formatDateValue = (value, key) => {
      if (key === 'Month/Year') {
        return moment(value, "YYYY-MM-DD' 'HH:mm:ss").format("YYYY-MM-DD' 'HH:mm:ss");
      }
      return value;
    };

    // Only insert new data if overrideExisting is null
    if (overrideExisting === null) {
      const insertPromises = newDatas.map(async row => {
        const values = [organization, username, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
        console.log('Inserting new record:', row);
        const insertQuery = `INSERT INTO Portfolio_Companies_format (${columns.join(', ')}) VALUES (?)`;
        await connection.query(insertQuery, [values]);
        console.log(values);
      });
      await Promise.all(insertPromises);
    } else {
      // Update existing rows
      const updatePromises = [];
      for (let i = 1; i < overrideExisting.length; i++) {
        const row = overrideExisting[i];
        const rowId = overrideExisting[0].id; // Extract the ID from the first object
        const values = [organization, username, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
        console.log('Updating existing record with ID:', rowId, row);
        const updateQuery = `UPDATE Portfolio_Companies_format SET ${columns.slice(2).map((col, index) => `${col} = ?${index === columns.slice(2).length - 1 ? '' : ','}`).join(' ')} WHERE ID = ?`;
        console.log('Update query:', updateQuery);

        const updatePromise = new Promise((resolve, reject) => {
          connection.query(updateQuery, [...values.slice(2), rowId], (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });
        updatePromises.push(updatePromise);

        console.log('Update values:', [...values.slice(2), rowId]);
      }
      await Promise.all(updatePromises);

      // Insert new rows
      const insertPromises = newDatas.map(async row => {
        const values = [organization, username, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
        console.log('Inserting new record:', row);
        const insertQuery = `INSERT INTO Portfolio_Companies_format (${columns.join(', ')}) VALUES (?)`;
        await connection.query(insertQuery, [values]);
      });

      await Promise.all(insertPromises);
    }


    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Data uploaded successfully' });
  } catch (error) {
    console.error('Error inserting/updating data:', error);
    res.status(500).json({ message: 'Error inserting/updating data' });
  }
});

module.exports = router;
