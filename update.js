const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const { columnMap } = require('./bulk-upload');

router.post('/update', bodyParser.json(), async (req, res) => {
    const { editedRow } = req.body;
  
    if (!editedRow || !editedRow.id) {
      return res.status(400).json({ message: 'Invalid request' });
    }
  
    const columnNames = Object.keys(editedRow).filter(column => column !== 'id');
    const placeholders = columnNames.map(() => '?').join(', ');
  
    try {
      const query = `UPDATE exceldata SET ${columnNames.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`;
      const [result] = await pool.query(query, [...Object.values(editedRow), editedRow.id]);
  
      if (result.affectedRows > 0) {
        setData(data.map(row => (row.id === editedRow.id ? editedRow : row)));
        setEditedRow(null);
        res.status(200).json({ message: 'Row updated successfully' });
      } else {
        res.status(200).json({ message: 'No changes made to the row' });
      }
    } catch (error) {
      console.error('Error updating row:', error);
      res.status(500).json({ message: 'Error updating row' });
    }
  });

  module.exports = router;