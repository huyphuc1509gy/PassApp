import jwt from 'jsonwebtoken'

export const verifyToken = (req,res,next) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({message : "Require Authorization"})
        }
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    }   
    catch (err) {
        return res.status(401).json({ message : 'Not valid token' });
    }
}
