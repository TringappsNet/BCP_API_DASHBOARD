const express = require('express');
const router = express.Router();
const pool = require('./pool');
const bodyParser = require('body-parser');
const updatedRow = require('./middlewares/updated-row');

router.use(bodyParser.json());

router.post('/', updatedRow, async (req, res) => {
  const { editedRow } = req.body;

  if (!editedRow || !editedRow.ID) {
    return res.status(400).json({ message: 'Invalid request or missing ID' });
  }

  try {
    // Convert the Quarter value to a number if necessary
    if (editedRow.Quarter) {
      editedRow.Quarter = parseInt(editedRow.Quarter.replace('Q', ''), 10);
    }

    // Construct set statements and values array
    const setStatements = [];
    const values = [];

    Object.entries(editedRow).forEach(([key, value]) => {
      // Skip ID field and null values
      if (key !== 'ID' && value !== null) {
        setStatements.push(`${key} = ?`);
        values.push(value);
      }
    });

    // Add ID value at the end
    values.push(editedRow.ID);

    // Construct SQL query
    const query = `UPDATE Portfolio_Companies_format SET ${setStatements.join(', ')} WHERE ID = ?`;

    // Execute the query
    const [result] = await pool.query(query, values);

    if (result.affectedRows > 0) {
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