require('dotenv').config();
const mysql = require('mysql2/promise');

async function update() {
    const pool = mysql.createPool({
        host: process.env.TIDB_HOST || 'localhost',
        port: process.env.TIDB_PORT || 4000,
        user: process.env.TIDB_USER || 'root',
        password: process.env.TIDB_PASSWORD || '',
        database: process.env.TIDB_DB_NAME || 'CollegeAttendance',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    });

    try {
        console.log('Adding CBSE/PU columns...');
        await pool.query(`
            ALTER TABLE attendance_data 
            ADD COLUMN cbse_strength INT DEFAULT 0,
            ADD COLUMN cbse_present INT DEFAULT 0,
            ADD COLUMN pu_strength INT DEFAULT 0,
            ADD COLUMN pu_present INT DEFAULT 0
        `);
        console.log('Success!');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN') {
            console.log('Columns already exist.');
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        await pool.end();
    }
}

update();
