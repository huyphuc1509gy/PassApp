import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config();

const { Client } = pg;

const db = new Client(
    {
        user: process.env.USER,
        host : process.env.HOST,
        database : process.env.DATABASE,
        password : process.env.PASSWORD,
        port : process.env.PORT
    }
);
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err.stack);
    } else {
        console.log('Connected to database successfully!');
    }
});

export default {
    query: (text, params) => db.query(text, params)
};