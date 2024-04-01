const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');
const columnMap = require('./Objects');


router.post('/', bodyParser.json(), async (req, res) => {
  const { userData, data } = req.body; 
  const { username, email } = userData;

  // Validate headers
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  // if (email !== emailHeader) {
  //   return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  // }
  
  if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertPromises = data.map(row => {
      const values = [email, username, ...Object.values(row).map(value => typeof value === 'string' ? value.replace(/ /g, '') : value)];
      const columns = ['Email', 'UserName', ...Object.keys(row).map(key => columnMap[key])];

      console.log('Inserting row:', values); 

      const query1 = 'INSERT INTO Portfolio_Companies_format (' + columns.join(', ') + ') VALUES (?)';
      return connection.query(query1, [values]);
    });

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