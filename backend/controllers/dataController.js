import db from '../config/db.js'


// Get encrypted data from backend
export const getData = async (req,res) => {
    const userId = req.user.userId ;
    try {
        const encryData = await db.query(` select * from user_vaults where user_id = $1 `, [userId]);
        res.status(200).json({encrypted_data : encryData.rows[0].encrypted_data});
    }
    catch (error) {
        console.error(error);
        res.status(500).json({message : "Server Error"});
    }   
}

// Update encrypted data from backend
export const updateData = async (req,res) => {
    const userId = req.user.userId ;
    const {encrypted_data} = req.body;
    try {
        console.log(userId, "---");
        const oldData = await db.query(`select * from user_vaults where user_id = $1`, [userId]);
        console.log(oldData.rows[0]);
        const oldVer = oldData.rows[0].ver;
        const vaultId = oldData.rows[0].vault_id;
        const updatedAt = new Date()
        const result = await db.query(`UPDATE user_vaults SET encrypted_data = $1,ver = $2 ,updated_at = $3 
    WHERE vault_id = $4 
    RETURNING ver`, [encrypted_data,oldVer + 1,updatedAt,vaultId]);
        if (result.rows.length === 0) {
            return res.status(400).json({message : "Not existed"})
        }
        res.status(200).json({ 
            message: "Update successed", 
            new_version: result.rows[0].ver 
        });

    }
    catch (error) {
        console.error(error);
        res.status(500).json({message : "Server Error"});
    }  
}