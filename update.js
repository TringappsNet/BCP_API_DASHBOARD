const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const columnMap = require('./bulk-upload');

// Import the updatedRow middleware
const updatedRow = require('./middlewares/updated-row');

router.use(bodyParser.json());
router.post('/', updatedRow, async (req, res) => {
  const { editedRow, data } = req.body;

  if (!editedRow || !editedRow.id) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  const columnNames = Object.keys(editedRow).filter(column => column !== 'id');
  const placeholders = columnNames.map(() => '?').join(', ');

  try {
    // Replace exceldata with the actual table name in your database
    const query = `UPDATE Portfolio_Companies_format SET ${columnNames.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`;
    const [result] = await pool.query(query, [...Object.values(editedRow), editedRow.id]);

    if (result.affectedRows > 0) {
      // Instead of setting the data directly, you should fetch the updated data from the database
      const updatedData = await fetchUpdatedData(data.map(row => (row.id === editedRow.id ? editedRow : row)));
      setData(updatedData);
      setEditedRow(null);
      res.status(200).json({ message: 'Row updated successfully', updatedData });
    } else {
      res.status(200).json({ message: 'No changes made to the row' });
    }
  } catch (error) {
    console.error('Error updating row:',error);
    res.status(500).json({ message: 'Error updating row' });
  }
});

// Add a new function to fetch the updated data from the database
async function fetchUpdatedData(editedRows) {
  // Replace this URL with your actual database endpoint
  const response = await fetch(`${PortURL}/data`);
  const updatedData = await response.json();
  return updatedData;
}

module.exports = router;