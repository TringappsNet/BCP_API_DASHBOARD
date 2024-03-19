const express = require('express');
const router = express.Router();
const pool = require('../pool');


router.post('/', bodyParser.json(), async (req, res) => {
const { data } = req.body;
    const { userName, organization } = req.session;
  
    if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
      return res.status(400).json({ message: 'Invalid JSON body format' });
    }
  
    try {
      const connection = await mysql.createConnection(config);
      await connection.beginTransaction();
  
      const insertPromises = data.map(row => {
        const values = [organization, userName, ...Object.values(row).map(value => typeof value === 'string' ? value.replace(/ /g, '') : value)];
        const columns = ['Organization', 'UserName', ...Object.keys(row).map(key => columnMap[key])];
  
        const query = 'INSERT INTO exceldata (' + columns.join(', ') + ') VALUES (' + values.map((_, i) => '?').join(', ') + ')';
        return connection.query(query, values);
      });
  
      await Promise.all(insertPromises);
      await connection.commit();
      await connection.end();
  
      res.status(200).json({ message: 'Data uploaded successfully' });
    } catch (error) {
      console.error('Error inserting data:', error);
      res.status(500).json({ message: 'Error inserting data' });
    }});
module.exports = router;