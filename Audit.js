const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.post('/', async (req, res) => {
  try {
    const auditLog = req.body;

    // Insert the audit log into the Portfolio_Audit table
    await pool.query('INSERT INTO Portfolio_Audit SET ?', auditLog);

    // Send the response
    res.status(200).json({ message: 'Audit log added successfully' });
  } catch (error) {
    console.error('Error adding audit log:', error);
    res.status(500).json({ message: 'Error adding audit log' });
  }
});

module.exports = router;
