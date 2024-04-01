const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.post('/', async (req, res) => {
  const sessionId = req.header('Session-ID');
  const emailHeader = req.header('Email');
  
  if (!sessionId || !emailHeader) {
    return res.status(400).json({ message: 'Session ID and Email headers are required!' });
  }
  
  // You may want to validate sessionId against your session data in the database
  
  if (email !== emailHeader) {
    return res.status(401).json({ message: 'Unauthorized: Email header does not match user data!' });
  }
  const { ids } = req.body;

  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    return res.status(400).json({ message: 'Invalid JSON body format' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const deletePromises = ids.map(id => {
      const query = 'DELETE FROM Portfolio_Companies_format WHERE id = ?';
      return connection.query(query, [id]);
    });

    await Promise.all(deletePromises);
    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Rows deleted successfully' });
  } catch (error) {
    console.error('Error deleting rows:', error);
    res.status(500).json({ message: 'Error deleting rows' });
  }
});

module.exports = router;