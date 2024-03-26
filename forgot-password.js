const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('./pool');

router.post('/', async (req, res) => {
    const { email } = req.body;

    try {
        console.log('Executing SQL query...');
        const [user] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);
        console.log('User found in database:', user);

        if (!user) {
            console.log('Email not found in database');
            return res.status(404).json({ message: 'Email not found' });
        }

        const resetToken = generateResetToken();

    
        await sendResetLink(email, resetToken);

        return res.status(200).json({ message: 'Reset link sent successfully' });
    } catch (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


function generateResetToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 10; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

async function sendResetLink(email, resetToken) {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587, 
            secure: false,
            auth: {
                user: 'sandhya.k@tringapps.net', 
                pass: 'lmzc dfhi zfqc wjab' 
            }
        });

        const resetLink = `https://yourwebsite.com/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: 'sender@example.com', // Sender's email address
            to: email, // Recipient's email address
            subject: 'Reset Your Password',
            text: `To reset your password, click on the following link: ${resetLink}`
        };

        await transporter.sendMail(mailOptions);
        console.log('Reset link email sent successfully');
    } catch (error) {
        console.error('Error sending reset link email:', error);
        throw error;
    }
}

module.exports = router;
