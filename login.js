const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const pool = require('./pool');
pool.query('USE myDatabase'); // Use your database name

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

router.post('/', async (req, res) => {
  const { userName, password } = req.body;

  if (!userName || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    let result;
    try {
      const [rows] = await connection.query('CALL loginUser(?, ?, ?)', [userName, password, []]);
      const [loginResponse] = rows;
      result = loginResponse[0];
    } catch (error) {
      await connection.rollback();
      console.error("Error executing loginUser stored procedure:", error);
      res.status(500).json({ message: 'Error executing loginUser stored procedure' });
    }
    connection.release();

    if (result.message === 'Logged In') {
      // Set the session ID as a cookie in the response headers
      res.cookie('sessionId', result.sessionID, {
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
      res.status(200).json({
        message: 'Logged In',
        username: userName,
        organization: result.organization
      });
    } else {
      res.status(result.messageCode).json({ message: result.message });
    }
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: 'Error logging in user' });
  }
});

module.exports = router;