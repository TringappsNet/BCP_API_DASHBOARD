const express = require('express');
const router = express.Router();
const pool = require('./pool');
const columnMap = require('./column-map');

router.post('/', async (req, res) => {
    const { userData, data } = req.body;
    const { username, organization } = userData;
  
    if (!Array.isArray(data) || !data.every(item => typeof item === 'object')) {
      return res.status(400).json({ message: 'Invalid JSON body format' });
    }
  
    console.log('userData:', userData);
    console.log('data :', data);
  
    try {
      const connection = await pool.getConnection();
      const duplicatePromises = data.map(async row => {
        const keys = Object.keys(row);
        console.log('keys :', keys);
  
        const mappedKeys = ['Organization', 'UserName', ...Object.keys(row).map(key => columnMap[key])];
        console.log('mappedKeys :', mappedKeys);
  
        const mappedValues = [organization, username, ...Object.values(row)
            .map((value) => (keys[mappedKeys.indexOf('Month/Year')] === 'Month/Year')
              ? value.replace(/ /g, '') : value
            )
          ];        
          
        console.log('mappedValues :', mappedValues);
  
        const monthYearValue = mappedValues[mappedKeys.indexOf('MonthYear')];
  
        const query = 'SELECT COUNT(*) as count FROM Portfolio_Companies_format WHERE UserName = ? AND Organization = ? AND MonthYear = ?';
        const result = await connection.query(query, [username, organization, monthYearValue]);

        console.log(result);

        console.log(`Month/Year: ${monthYearValue}`);

        const isDuplicate = result[0][0].count > 0;
        console.log(`isDuplicate ${isDuplicate}`);

        
        return {
          isDuplicate: isDuplicate,
          rowId: result[0][0].id || null,

        };
      });
  
      const results = await Promise.all(duplicatePromises);
      res.status(200).json({ data: results });
      connection.release();
    } catch (error) {
      console.error('Error validating duplicates:', error);
      res.status(500).json({ message: 'Error validating duplicates' });
    }
  });
  
module.exports = router;
