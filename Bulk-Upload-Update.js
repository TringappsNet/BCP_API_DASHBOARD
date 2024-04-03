const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');
const {columnMap} = require('./Objects');

router.post('/', bodyParser.json(), async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  const { userData, overrideExisting, newDatas } = req.body;
  const { username, organization, email, roleID } = userData;
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }

  if (!Array.isArray(newDatas) || !newDatas.every(item => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format for new data' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const [orgResult] = await connection.query('SELECT org_ID FROM organization WHERE org_name = ?', [organization]);
    const orgID = orgResult[0] ? orgResult[0].org_ID : null;

    if (!orgID) {
      throw new Error('Organization not found');
    }

    const columns = ['Org_ID', 'UserName', 'Role_ID', ...Object.keys(newDatas[0]).map(key => columnMap[key])];
    console.log('Columns:', columns);

    const formatDateValue = (value, key) => {
      if (key === 'Month/Year') {
        const dateParts = value.split('-');
        return `${dateParts[0]}-${dateParts[1]}-01 00:00:00`;
      }
      return value;
    };

    // Only insert new data if overrideExisting is null
    if (overrideExisting === null) {
      const insertPromises = newDatas.map(async row => {
        const values = [orgID, username, roleID, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
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
          const values = [roleID, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
          console.log('Updating existing record with ID:', rowId, row);
          const updateQuery = `UPDATE Portfolio_Companies_format SET ${columns.slice(2).map((col, index) => `${col} = ?${index === columns.slice(2).length - 1 ? '' : ','}`).join(' ')} WHERE ID = ?`;
          console.log('Update query:', updateQuery);

          const updatePromise = new Promise((resolve, reject) => {
            connection.query(updateQuery, [...values, rowId], (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(results);
              }
            });
          
          });
          
  updatePromises.push(updatePromise);

  updatePromise.then(result => {
    console.log('Update result:', result);
    console.log('Status: updated');
  }).catch(error => {
    console.error('Update error:', error);
    console.log('Status: error');
  });

  console.log('Update values:', [...values, rowId]);
}

await Promise.all(updatePromises);

      // Insert new rows
      const insertPromises = newDatas.map(async row => {
        const values = [orgID, username, roleID, ...Object.values(row).map((value, index) => formatDateValue(value, Object.keys(row)[index]))];
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

