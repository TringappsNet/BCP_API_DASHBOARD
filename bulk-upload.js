const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const moment = require('moment');
const { columnMap } = require('./Objects');


router.post('/', bodyParser.json(), async (req, res) => {
  const { userData, data } = req.body; 
  const { username, orgID, email, roleID } = userData; // Add roleID to the destructured object

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

    const insertPromises = data.map(row => {
      const values = [orgID, username, roleID, ...Object.values(row).map(value => typeof value === 'string' ? value.replace(/ /g, '') : value)];
      const columns = ['Org_ID', 'UserName', 'Role_ID', ...Object.keys(row).map(key => columnMap[key])];
    
      const placeholders = values.map(() => '?').join(', '); 
      const query1 = 'INSERT INTO Portfolio_Companies_format (' + columns.join(', ') + ') VALUES (' + placeholders + ')'; // Combine columns and placeholders
      return connection.query(query1, values); 
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