const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./bulk-upload');

router.get('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }
    try {
        const [rows] = await pool.query('SELECT * FROM Portfolio_Companies_format');
        const data = rows.map(row => {
          const newRow = {};
          Object.keys(row).forEach(key => {
            const newKey = columnMap[key] || key;
            newRow[newKey] = row[key];
          });
          return newRow;
        });
        res.status(200).json(data);
      } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ message: 'Error retrieving data' });
      }});
module.exports = router;