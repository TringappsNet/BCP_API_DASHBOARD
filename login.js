const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('./pool');
const { emailRegex } = require('./Objects');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's Email Address   
 *         password:
 *           type: string
 *           description: User's Password
 *       required:
 *         - email
 *         - password
 *       example:
 *         email: sandhya.k@tringapps.net
 *         password: 12345
 *     LoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Message indicating successful login
 *         UserName:
 *           type: string
 *           description: User's name
 *         userId:
 *           type: integer
 *           description: User's ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's Email Address
 *         sessionId:
 *           type: string
 *           description: Session ID generated for the user
 *         Organization:
 *           type: string
 *           description: User's organization name
 *         Role_ID:
 *           type: integer
 *           description: User's role ID
 *         Org_ID:
 *           type: integer
 *           description: Organization's ID
 *         role:
 *           type: string
 *           description: User's role
 *       required:
 *         - message
 *         - UserName
 *         - userId
 *         - email
 *         - sessionId
 *         - Organization
 *         - Role_ID
 *         - Org_ID
 *         - role
 *       example:
 *         message: "Logged in successfully"
 *         UserName: "Sandhya"
 *         userId: 123
 *         email: "sandhya.k@tringapps.net"
 *         sessionId: "abcdef123456"
 *         Organization: "Tringapps Inc."
 *         Role_ID: 1
 *         Org_ID: 456
 *         role: "Admin"
 */

/**
 * @swagger
 * /login:
 *   post:
 *     tags: 
 *       - 'Portfolio'
 *     summary: User Login
 *     description: Logs in a user with the provided email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       '400':
 *         description: Invalid credentials or missing information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating invalid credentials or missing information.
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating unauthorized access.
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating an internal server error.
 */

router.post('/', async (req, res) => {
    const { email, password } = req.body;
  
    try {
        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        // Validate email format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address!' });
        }

        // Retrieve user information from the database including organization name
        const [rows] = await pool.query(`
            SELECT u.*, o.org_name AS OrganizationName, r.role AS roleName
            FROM users u
            LEFT JOIN organization o ON u.Org_ID = o.org_ID
            LEFT JOIN role r ON u.Role_ID = r.role_ID
            WHERE Email = ?`, [email]);
        
        // Check if the user exists
        if (rows.length > 0) {
            const user = rows[0];
            const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
            const isActive = user.isActive;

            if(isActive === 0){
                return res.status(400).json({ error: 'User Inactive. Please contact the administrator for further assistance.' });
            }
            
            if (isValidPassword) {
                // Generate session details
                const sessionId = req.sessionID;
                const role = user.roleName;
                const userId = user.UserID;
                const UserName = user.UserName;
                const Organization = user.OrganizationName;
                const Role_ID = user.Role_ID; 
                const Org_ID = user.Org_ID;
                const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
                const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
                await pool.query('UPDATE users SET CurrentSessionID = ?, LastLoginTime = ? WHERE Email = ?', [sessionId, createdAt, email]);

                // Set session cookie
                res.cookie('sessionId', sessionId, {
                    httpOnly: true,
                    secure: false,
                    maxAge: 10 * 60 * 1000
                });

                
                // Respond with user information and session details
                return res.status(200).json({
                    message: 'Logged In',
                    UserName: UserName,
                    userId: userId,
                    email: email,
                    sessionId: sessionId,
                    Organization: Organization,
                    Role_ID: Role_ID,
                    Org_ID:Org_ID,
                    role:role
                });
            } else {
                // Invalid password
                return res.status(401).json({ error: 'Invalid Credentials!' });
            }
        } else {
            // User not found
            return res.status(400).json({ error: 'Invalid Credentials!' });
        }
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({ error: 'User Not Registered!' });
    }
});

module.exports = router;
