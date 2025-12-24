import db from '../config/db.js'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

// Mail Config

const tranport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Send OTP
export const sendOtp = async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Random otp

    try {
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // Expried after 10 min
        const result = await db.query(
            `UPDATE users SET otp_code = $1, otp_expires_at = $2 
            WHERE email = $3 RETURNING user_id`,
            [otp, expiry, email]
        );

        // Fake ?
        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'OTP Sended' });
        }

        await tranport.sendMail({
            from: `"Password Manager" <no-reply.passapp@app.com>`,
            to: email,
            subject: 'Recovery OTP',
            text: `Your OTP is : ${otp}`
        });
        res.status(200).json({ message: 'OTP Sended' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Mail error' });
    }
}

// Authorization OTP + Send Backup
export const verifyOtpAndGetBackup = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const result = await db.query(`select user_id, otp_code, otp_expires_at, backup_key_hash
            from users where email = $1`, [email]);
        const user = result.rows[0];

        // Check OTP
        if (!user || user.otp_code != otp) {
            return res.status(400).json({ message: `Incorrect OTP` });
        }
        // Check Exp
        if (new Date() > new Date(user.otp_expires_at)) {
            return res.status(400).json({ message: "Expired OTP" });
        }

        // JWT Token for pass reset
        const resetToken = jwt.sign({ userId: user.user_id, purpose: 'reset' },
            process.env.JWT_SECRET, { expiresIn: '15m' });

        res.json({
            success: true,
            backupKeyHash: user.backup_key_hash,
            resetToken
        })
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

// Change password
export const resetPassword = async (req,res) => {
    const {newAuthKey , newBackupKeyHash, newEncryptedData }  = req.body ;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Check token
    if (!token) return res.status(401).json({ message: 'Missing Token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'reset') 
            {return res.status(403).json({ message: 'Unvalid Token' });}
        const userId = decoded.userId

        await db.query('BEGIN');
        const saltRounds = 10;
        const newAuthKeyHash = await bcrypt.hash(newAuthKey, saltRounds);

        // Update user 
        await db.query(
            `update users set auth_key_hash = $1, backup_key_hash = $2,otp_code = NULL, otp_expires_at = NULL where user_id = $3`,
            [newAuthKeyHash, newBackupKeyHash, userId]
        );

        // Update user vaults
        await db.query(
            `update user_vaults set encrypted_data = $1 where user_id = $2`,
            [newEncryptedData, userId]
        );

        await db.query("COMMIT");
        res.status(200).json({message : "Password Changed"});
    }
    catch (error) {
        await db.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: "Sever Error"});
    }
}