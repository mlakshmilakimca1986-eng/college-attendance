const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcryptjs');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.TIDB_HOST,
            user: process.env.TIDB_USER,
            password: process.env.TIDB_PASSWORD,
            database: process.env.TIDB_DATABASE,
            port: process.env.TIDB_PORT,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            }
        });

        const hash = await bcrypt.hash('Admin@123', 10);
        
        // We use campus_email as the unique identifier for admin login in this case, 
        // or username 'admin'. Let's ensure BOTH match what the user wants.
        await db.execute(
            `INSERT INTO users (username, password, principal_name, campus_email, whatsapp_number, role, is_approved) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE username=?, password=?, role='admin', is_approved=TRUE`,
            ['pucacademics', hash, 'Main Admin', 'pucacademics@srichaitanyacollege.net', '0000000000', 'admin', true, 'pucacademics', hash]
        );

        console.log('Admin account (pucacademics@srichaitanyacollege.net) is ready.');
        process.exit(0);
    } catch (e) {
        console.error('Error setting up admin:', e);
        process.exit(1);
    }
})();
