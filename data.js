const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./bulk-upload')

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM exceldata');
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