import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../config/db.js'


// Register func 
export const register = async (req, res) => {
    console.log(req.body)
    const { email, authKey, backupKeyHash, initVault } = req.body;
    
    try {
        // Check existed email 
        const userCheck = await db.query("Select * from users where email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "Existed email!!" });
        }


        await db.query('BEGIN');

        // Hash authKey 
        const saltRounds = 10;
        const authKeyHash = await bcrypt.hash(authKey, saltRounds);

        // Create new user and user_data with emtpy vault
        const userRes = await db.query(`
            insert into users (email, auth_key_hash , backup_key_hash )
            values ($1, $2, $3)
            RETURNING user_id;
            `, [email, authKeyHash, backupKeyHash]);
        const user_ID = userRes.rows[0].user_id;
        console.log("1")
        console.log(user_ID);
        await db.query(`
                insert into user_vaults (user_id, encrypted_data, ver) 
                values ($1, $2, $3)
                `, [user_ID, '' , 1]);
        await db.query("COMMIT;")
        res.status(200).json({message : "Registy success"})

    }
    catch (error) {
        await db.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Server Error" })
    }
}


// Login func
export const login = async (req, res) => {
    const { email, authKey } = req.body;
    console.log("LOgedin")
    try {
        // Find email
        const userSearch = await db.query(`Select * from users where email = $1`, [email]);
        if (userSearch.rows.length === 0) {
            return res.status(401).json({ message: 'Email or Password is not correct!!' });
        }

        // Compare authkey
        const user = userSearch.rows[0];
        const isMatch = await bcrypt.compare(authKey, user.auth_key_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email or Password is not correct!!' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        )

        res.json({
            message: "Successed",
            token,
            userId: user.userId
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

// Change passs , 
export const changePassword = async (req, res) => {
    const userId = req.user.userId;
    const { newAuthKey, newEncryptedData, newBackupKeyHash } = req.body;
    try {
        await db.query('BEGIN');
        const newAuthKeyHash = await bcrypt.hash(newAuthKey, 10);
        await db.query(
            `UPDATE users SET auth_key_hash = $1, backup_key_hash = $2 WHERE user_id = $3`,
            [newAuthKeyHash, newBackupKeyHash, userId]
        );
        await db.query(
            `UPDATE user_vaults SET encrypted_data = $1, ver = ver + 1, updated_at = NOW() WHERE user_id = $2`,
            [newEncryptedData, userId]
        );
        await db.query('COMMIT');
        res.status(201).json({ message: "Change Password Success" });

    }
    catch (error) {
        await db.query('ROLLBACK');
        res.status(500).json({ message: 'Server Error' });
    }
}