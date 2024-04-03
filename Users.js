/**
 * @swagger
 * /users:
 *   get:
 *     tags: ['Portfolio']
 *     summary: Retrieve user information
 *     description: Retrieves user information along with organization name and role.
 *     responses:
 *       '200':
 *         description: A list of users with their information
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   UserName:
 *                     type: string
 *                     description: The username of the user
 *                   Organization:
 *                     type: string
 *                     description: The organization name of the user
 *                   Email:
 *                     type: string
 *                     description: The email address of the user
 *                   Role:
 *                     type: string
 *                     description: The role of the user
 *                   isActive:
 *                     type: boolean
 *                     description: Indicates whether the user is active or not
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the internal server error
 */

const express = require('express');
const router = express.Router();
const pool = require('./pool');

router.get('/', async (req, res) => {
  try {
    // Query the database to retrieve user information along with organization name and role
    const query = `
    SELECT 
    u.UserName, 
    o.org_name AS Organization, 
    u.Email, 
    r.role AS Role, 
    u.isActive
FROM 
    users u
LEFT JOIN 
    organization o ON u.Org_ID = o.org_ID
LEFT JOIN 
    role r ON u.Role_ID = r.role_ID;
    `;
    const [rows] = await pool.query(query);
    
    // Send back the array of user information
    res.status(200).json(rows);
  } catch (error) {
    // If an error occurs, send a 500 Internal Server Error response
    console.error('Error retrieving users:', error);
    res.status(500).json({ error: 'Error retrieving users' });
  }
});

module.exports = router;
