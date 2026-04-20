const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// GLOBAL MONITOR: Log every single request to see what's happening
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const dbConfig = {
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'CollegeAttendance',
    port: process.env.TIDB_PORT,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

let pool;
async function initDB() {
    try {
        pool = await mysql.createPool(dbConfig);
        console.log('TiDB Connected');
        
        // Run migrations silently
        const runSQL = async (sql) => {
            try { await pool.query(sql); } catch (e) { /* ignore existing columns/indexes */ }
        };

        await runSQL(`ALTER TABLE attendance_data ADD COLUMN IF NOT EXISTS finalized TINYINT(1) DEFAULT 0`);
        await runSQL(`ALTER TABLE attendance_data ADD UNIQUE INDEX ui_attendance (principal_id, date, branch, stream)`);
        
    } catch (err) { 
        console.error('CRITICAL DATABASE ERROR:', err.message); 
    }
}
initDB();

app.get('/api/health', (req, res) => {
    res.send({ status: 'ok', db: pool ? 'connected' : 'error' });
});

const auth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = verified;
        next();
    } catch (err) { res.status(400).send('Invalid Token'); }
};

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(campus_email) = LOWER(?)', [username, username]);
        if (rows.length === 0) return res.status(404).send('User not found');
        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).send('Invalid password');
        
        if (user.role === 'principal' && !user.is_approved) {
            return res.status(403).send('Approval pending! Please wait for Admin to approve your account.');
        }

        const token = jwt.sign({ id: user.id, role: user.role, name: user.principal_name }, process.env.JWT_SECRET || 'secret');
        res.send({ token, role: user.role, name: user.principal_name });
    } catch (err) { res.status(500).send(err.message); }
});

// --- ATTENDANCE (THE SAVE ROUTE) ---
app.post('/api/attendance/save', auth, async (req, res) => {
    const { date, data, finalize } = req.body;
    console.log(`>>> SAVE REQUEST: Date=${date}, Finalize=${finalize}, Rows=${data.length}`);
    try {
        if (!data || data.length === 0) return res.send('No data to save');

        const values = [];
        const params = [];
        
        for (const item of data) {
            const cb_s = parseInt(item.cbse_strength) || 0;
            const cb_p = parseInt(item.cbse_present) || 0;
            const pu_s = parseInt(item.pu_strength) || 0;
            const pu_p = parseInt(item.pu_present) || 0;
            
            // Fallback: If granular fields are 0, use direct strength/present (for Juniors/LTC)
            let total_s = cb_s + pu_s;
            let total_p = cb_p + pu_p;
            
            if (total_s === 0 && item.strength) total_s = parseInt(item.strength) || 0;
            if (total_p === 0 && item.present) total_p = parseInt(item.present) || 0;

            const isEntryFinalized = (finalize && (total_s > 0 || total_p > 0)) ? 1 : 0;
            
            values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            params.push(
                req.user.id, 
                date, 
                item.branch, 
                item.stream, 
                total_s, 
                total_p, 
                isEntryFinalized,
                cb_s,
                cb_p,
                pu_s,
                pu_p
            );
        }

        const sql = `
            INSERT INTO attendance_data (
                principal_id, date, branch, stream, strength, present, finalized,
                cbse_strength, cbse_present, pu_strength, pu_present
            ) 
            VALUES ${values.join(',')}
            ON DUPLICATE KEY UPDATE 
                strength = VALUES(strength), 
                present = VALUES(present), 
                finalized = CASE WHEN finalized = 1 THEN 1 ELSE VALUES(finalized) END,
                cbse_strength = VALUES(cbse_strength),
                cbse_present = VALUES(cbse_present),
                pu_strength = VALUES(pu_strength),
                pu_present = VALUES(pu_present)
        `;

        await pool.query(sql, params);
        res.send('Success');
    } catch (err) {
        console.error('>>> SAVE FAILED:', err.message);
        res.status(500).send(err.message);
    }
});

app.get('/api/attendance/get', auth, async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).send('Date is required');
    try {
        const [rows] = await pool.query('SELECT * FROM attendance_data WHERE principal_id = ? AND date = ?', [req.user.id, date]);
        res.send(rows);
    } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN ---
// --- REGISTRATION ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password, principal_name, campus_email, whatsapp_number } = req.body;
    try {
        const hashedPass = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, principal_name, campus_email, whatsapp_number, role, is_approved) VALUES (?, ?, ?, ?, ?, "principal", FALSE)',
            [username, hashedPass, principal_name, campus_email, whatsapp_number]
        );
        res.send('Registration successful! Please wait for Admin approval.');
    } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN CONTROL ---
app.get('/api/admin/pending', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    try {
        const [rows] = await pool.query('SELECT id, principal_name, campus_email, whatsapp_number FROM users WHERE role = "principal" AND is_approved = FALSE');
        res.send(rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/approve/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    try {
        await pool.query('UPDATE users SET is_approved = TRUE WHERE id = ?', [req.params.id]);
        res.send('Approved');
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/reset-password', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    const { userId, newPassword } = req.body;
    try {
        const hashedPass = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPass, userId]);
        res.send('Password updated');
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/admin/attendance/:principal_id', auth, async (req, res) => {
    const { date } = req.query;
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    try {
        const [rows] = await pool.query('SELECT * FROM attendance_data WHERE principal_id = ? AND date = ? AND finalized = 1', [req.params.id || req.params.principal_id, date]);
        res.send(rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/admin/user/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    try {
        await pool.query('DELETE FROM attendance_data WHERE principal_id = ?', [req.params.id]);
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.send('User and their data deleted');
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/admin/stats', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        const [users] = await pool.query('SELECT id, principal_name, username, campus_email, whatsapp_number FROM users WHERE role = "principal" AND is_approved = TRUE');
        const [attendance] = await pool.query('SELECT principal_id, finalized, strength, present FROM attendance_data WHERE date = ? AND finalized = 1', [targetDate]);
        
        const branchStats = users.map(u => {
            const branchAttendance = attendance.filter(a => a.principal_id === u.id);
            const totalStr = branchAttendance.reduce((sum, a) => sum + (a.strength || 0), 0);
            const totalPre = branchAttendance.reduce((sum, a) => sum + (a.present || 0), 0);
            
            return {
                ...u,
                totalStrength: totalStr,
                totalPresent: totalPre,
                status: totalStr > 0 ? 'finalized' : 'pending'
            };
        });

        res.send({
            totalBranches: users.length,
            submitted: branchStats.filter(b => b.totalStrength > 0).length,
            branches: branchStats
        });
    } catch (err) { res.status(500).send(err.message); }
});

const ExcelJS = require('exceljs');

const CAMPUSES = [
  "BANASWADI", "HORAMAVU", "KAGGADASPURA", "KR PURAM", "KUDLU", 
  "MARTHAHALLI", "MARTHAHALLI C-120", "BELLANDUR", "HEGDENAGAR", "RAJAJI NAGAR", 
  "SESHADRIPURAM", "VIDYARANYAPURA", "YESHWANTHPUR", "MAGADI ROAD", "PEENYA DASARAHALLI", 
  "ELECTRONIC CITY", "ELECTRONIC CITY DS", "ECITY NEET BOYS", "SARJAPURA", "NAGARBHAVI", 
  "UTTARAHALLI", "J P NAGAR", "BANNERGHATTA ROAD", "KORAMANGALA", "KANAKAPURA ROAD", 
  "MANGALORE", "TUMKUR", "MANDYA", "MYSORE", "DR BS RAO VIDYASOUDHA", 
  "HUBLI 2", "DAVANAGERE", "DAVANAGERE 2", "BALLARI GIRLS", "BALLARI BOYS", 
  "BELAGAVI", "KOLAR", "SHIVAMOGGA"
];

const colMapping = {
  "INCOMING SENIORS": {
    "Super60(N)": { str: 5, pre: 6 }, "Super60(S)": { str: 7, pre: 8 }, "Elite(C-120)": { str: 9, pre: 10 }, "S60(Star)": { str: 11, pre: 12 }, "C120(Star)": { str: 13, pre: 14 },
    "JEE Apex": { str: 15, pre: 16 }, "MPL-ELITE": { str: 17, pre: 18 }, "AIIMS S60": { str: 19, pre: 20 }, "NEET Wisdom": { str: 21, pre: 22 }, "Sr.ELITE & AS60 (Star)": { str: 23, pre: 24 }
  },
  "OUTGOING SENIORS": {
    "Super60(N)": { str: 28, pre: 29 }, "Super60(S)": { str: 30, pre: 31 }, "Elite(C-120)": { str: 32, pre: 33 }, "S60(Star)": { str: 34, pre: 35 }, "C120(Star)": { str: 36, pre: 37 },
    "JEE Apex (2Hrs)": { str: 38, pre: 39 }, "MPL-ELITE": { str: 40, pre: 41 }, "AIIMS S60": { str: 42, pre: 43 }, "NEET Wisdom (2Hrs)": { str: 44, pre: 45 }, "Sr.ELITE & AS60 (Star)": { str: 46, pre: 47 }
  },
  "LTC-VAIDYAH": {
    "LTC-VAIDYAH": { str: 51, pre: 52 }
  },
  "CO-IPL": {
    "7TH CLASS": { str: 54, pre: 55 }, "8TH CLASS": { str: 56, pre: 57 }, "9TH CLASS": { str: 58, pre: 59 }, "10TH CLASS": { str: 60, pre: 61 }
  }
};

app.get('/api/admin/export-excel', auth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Admin only');
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        const [users] = await pool.query('SELECT id, principal_name FROM users WHERE role = "principal" AND is_approved = TRUE');
        const [attendance] = await pool.query('SELECT principal_id, branch, stream, strength, present FROM attendance_data WHERE date = ? AND finalized = 1', [targetDate]);

        const path = require('path');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(path.join(__dirname, 'template.xlsx'));
        const sheet = workbook.worksheets[0] || workbook.getWorksheet('STREAM WISE');

        const parts = targetDate.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        sheet.getCell('U2').value = `Date:${formattedDate}`;

        const incCols = Object.values(colMapping["INCOMING SENIORS"]);
        const outCols = Object.values(colMapping["OUTGOING SENIORS"]);
        const ltcCols = Object.values(colMapping["LTC-VAIDYAH"]);
        const coCols = Object.values(colMapping["CO-IPL"]);

        const colName = (n) => {
            let s = "";
            while (n > 0) {
                let m = (n - 1) % 26;
                s = String.fromCharCode(65 + m) + s;
                n = Math.floor((n - 1) / 26);
            }
            return s;
        };

        let startRow = 6;
        for (let i = 0; i < CAMPUSES.length; i++) {
            const campusName = CAMPUSES[i].toUpperCase();
            const rowIdx = startRow + i;
            const row = sheet.getRow(rowIdx);

            // Wipe out the old data in the template before throwing down the new payload
            for (const b in colMapping) {
                for (const s in colMapping[b]) {
                    row.getCell(colMapping[b][s].str).value = 0;
                    row.getCell(colMapping[b][s].pre).value = 0;
                }
            }

            const campusUser = users.find(u => u.principal_name.toUpperCase() === campusName);
            if (!campusUser) continue;

            const campusData = attendance.filter(a => a.principal_id === campusUser.id);
            for (const item of campusData) {
                const map = colMapping[item.branch];
                if (map && map[item.stream]) {
                    row.getCell(map[item.stream].str).value = parseInt(item.strength) || 0;
                    row.getCell(map[item.stream].pre).value = parseInt(item.present) || 0;
                }
            }
            row.commit();
        }

        for (let r = 6; r <= 43; r++) {
            const row = sheet.getRow(r);
            const y = 25, z = 26, aa = 27;
            const av = 48, aw = 49, ax = 50;
            const ba = 53;
            const bj = 62, bk = 63, bl = 64;
            const bn = 66, bo = 67, bp = 68;

            row.getCell(y).value = { formula: `SUM(${incCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(z).value = { formula: `SUM(${incCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(aa).value = { formula: `IF(${colName(y)}${r}=0,0,ROUND((${colName(z)}${r}/${colName(y)}${r})*100,1))` };

            row.getCell(av).value = { formula: `SUM(${outCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(aw).value = { formula: `SUM(${outCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(ax).value = { formula: `IF(${colName(av)}${r}=0,0,ROUND((${colName(aw)}${r}/${colName(av)}${r})*100,1))` };

            row.getCell(ba).value = { formula: `IF(${colName(ltcCols[0].str)}${r}=0,0,ROUND((${colName(ltcCols[0].pre)}${r}/${colName(ltcCols[0].str)}${r})*100,1))` };

            row.getCell(bj).value = { formula: `SUM(${coCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(bk).value = { formula: `SUM(${coCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(bl).value = { formula: `IF(${colName(bj)}${r}=0,0,ROUND((${colName(bk)}${r}/${colName(bj)}${r})*100,1))` };

            row.getCell(bn).value = { formula: `${colName(y)}${r}+${colName(av)}${r}+${colName(ltcCols[0].str)}${r}+${colName(bj)}${r}` };
            row.getCell(bo).value = { formula: `${colName(z)}${r}+${colName(aw)}${r}+${colName(ltcCols[0].pre)}${r}+${colName(bk)}${r}` };
            row.getCell(bp).value = { formula: `IF(${colName(bn)}${r}=0,0,ROUND((${colName(bo)}${r}/${colName(bn)}${r})*100,1))` };
            
            row.commit();
        }

        const bottomRow = sheet.getRow(44);
        for (let c = 5; c <= 67; c++) {
            if ([27, 50, 53, 64].includes(c)) continue;
            bottomRow.getCell(c).value = { formula: `SUM(${colName(c)}6:${colName(c)}43)` };
        }
        bottomRow.getCell(27).value = { formula: `IF(${colName(25)}44=0,0,ROUND((${colName(26)}44/${colName(25)}44)*100,1))` };
        bottomRow.getCell(50).value = { formula: `IF(${colName(48)}44=0,0,ROUND((${colName(49)}44/${colName(48)}44)*100,1))` };
        bottomRow.getCell(53).value = { formula: `IF(${colName(51)}44=0,0,ROUND((${colName(52)}44/${colName(51)}44)*100,1))` };
        bottomRow.getCell(64).value = { formula: `IF(${colName(62)}44=0,0,ROUND((${colName(63)}44/${colName(62)}44)*100,1))` };
        bottomRow.getCell(68).value = { formula: `IF(${colName(66)}44=0,0,ROUND((${colName(67)}44/${colName(66)}44)*100,1))` };
        bottomRow.commit();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${formattedDate}_COLLEGE ATTENDANCE.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
app.get('/api/attendance/export-excel', auth, async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        const [users] = await pool.query('SELECT id, principal_name FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).send('User not found');
        const currentUser = users[0];
        const [attendance] = await pool.query('SELECT principal_id, branch, stream, strength, present FROM attendance_data WHERE principal_id = ? AND date = ?', [req.user.id, targetDate]);
        const path = require('path');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(path.join(__dirname, 'template.xlsx'));
        const sheet = workbook.worksheets[0] || workbook.getWorksheet('STREAM WISE');
        const parts = targetDate.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        sheet.getCell('U2').value = `Date:${formattedDate}`;
        const incCols = Object.values(colMapping["INCOMING SENIORS"]);
        const outCols = Object.values(colMapping["OUTGOING SENIORS"]);
        const ltcCols = Object.values(colMapping["LTC-VAIDYAH"]);
        const coCols = Object.values(colMapping["CO-IPL"]);
        const colName = (n) => {
            let s = "";
            while (n > 0) {
                let m = (n - 1) % 26;
                s = String.fromCharCode(65 + m) + s;
                n = Math.floor((n - 1) / 26);
            }
            return s;
        };
        let startRow = 6;
        for (let i = 0; i < CAMPUSES.length; i++) {
            const campusName = CAMPUSES[i].toUpperCase();
            const rowIdx = startRow + i;
            const row = sheet.getRow(rowIdx);
            for (const b in colMapping) {
                for (const s in colMapping[b]) {
                    row.getCell(colMapping[b][s].str).value = 0;
                    row.getCell(colMapping[b][s].pre).value = 0;
                }
            }
            if (currentUser.principal_name.toUpperCase() === campusName) {
                for (const item of attendance) {
                    const map = colMapping[item.branch];
                    if (map && map[item.stream]) {
                        row.getCell(map[item.stream].str).value = parseInt(item.strength) || 0;
                        row.getCell(map[item.stream].pre).value = parseInt(item.present) || 0;
                    }
                }
            }
            row.commit();
        }
        for (let r = 6; r <= 43; r++) {
            const row = sheet.getRow(r);
            const y = 25, z = 26, aa = 27, av = 48, aw = 49, ax = 50, ba = 53, bj = 62, bk = 63, bl = 64, bn = 66, bo = 67, bp = 68;
            row.getCell(y).value = { formula: `SUM(${incCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(z).value = { formula: `SUM(${incCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(aa).value = { formula: `IF(${colName(y)}${r}=0,0,ROUND((${colName(z)}${r}/${colName(y)}${r})*100,1))` };
            row.getCell(av).value = { formula: `SUM(${outCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(aw).value = { formula: `SUM(${outCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(ax).value = { formula: `IF(${colName(av)}${r}=0,0,ROUND((${colName(aw)}${r}/${colName(av)}${r})*100,1))` };
            row.getCell(ba).value = { formula: `IF(${colName(ltcCols[0].str)}${r}=0,0,ROUND((${colName(ltcCols[0].pre)}${r}/${colName(ltcCols[0].str)}${r})*100,1))` };
            row.getCell(bj).value = { formula: `SUM(${coCols.map(c => colName(c.str)+r).join(',')})` };
            row.getCell(bk).value = { formula: `SUM(${coCols.map(c => colName(c.pre)+r).join(',')})` };
            row.getCell(bl).value = { formula: `IF(${colName(bj)}${r}=0,0,ROUND((${colName(bk)}${r}/${colName(bj)}${r})*100,1))` };
            row.getCell(bn).value = { formula: `${colName(y)}${r}+${colName(av)}${r}+${colName(ltcCols[0].str)}${r}+${colName(bj)}${r}` };
            row.getCell(bo).value = { formula: `${colName(z)}${r}+${colName(aw)}${r}+${colName(ltcCols[0].pre)}${r}+${colName(bk)}${r}` };
            row.getCell(bp).value = { formula: `IF(${colName(bn)}${r}=0,0,ROUND((${colName(bo)}${r}/${colName(bn)}${r})*100,1))` };
            row.commit();
        }
        const bottomRow = sheet.getRow(44);
        for (let c = 5; c <= 67; c++) {
            if ([27, 50, 53, 64].includes(c)) continue;
            bottomRow.getCell(c).value = { formula: `SUM(${colName(c)}6:${colName(c)}43)` };
        }
        bottomRow.getCell(27).value = { formula: `IF(${colName(25)}44=0,0,ROUND((${colName(26)}44/${colName(25)}44)*100,1))` };
        bottomRow.getCell(50).value = { formula: `IF(${colName(48)}44=0,0,ROUND((${colName(49)}44/${colName(48)}44)*100,1))` };
        bottomRow.getCell(53).value = { formula: `IF(${colName(51)}44=0,0,ROUND((${colName(52)}44/${colName(51)}44)*100,1))` };
        bottomRow.getCell(64).value = { formula: `IF(${colName(62)}44=0,0,ROUND((${colName(63)}44/${colName(62)}44)*100,1))` };
        bottomRow.getCell(68).value = { formula: `IF(${colName(66)}44=0,0,ROUND((${colName(67)}44/${colName(66)}44)*100,1))` };
        bottomRow.commit();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${formattedDate}_${currentUser.principal_name}_Attendance.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});


// Helper to map stream blocks in Format-Blr
const consolidatedMapping = {
    "INCOMING SENIORS": {
        "Super60(N)": 5, "Super60(S)": 12, "Elite(C-120)": 19, "S60(Star)": 26, "C120(Star)": 33,
        "JEE Apex": 40, "MPL-ELITE": 47, "AIIMS S60": 54, "NEET Wisdom": 61, "Sr.ELITE & AS60 (Star)": 68
    },
    "OUTGOING SENIORS": {
        "Super60(N)": 5, "Super60(S)": 12, "Elite(C-120)": 19, "S60(Star)": 26, "C120(Star)": 33,
        "JEE Apex (2Hrs)": 40, "MPL-ELITE": 47, "AIIMS S60": 54, "NEET Wisdom (2Hrs)": 61, "Sr.ELITE & AS60 (Star)": 68
    }
};

app.get('/api/attendance/export-consolidated', auth, async (req, res) => {
    const { date, admin } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        let attendance, userList;
        if (req.user.role === 'admin' && admin === 'true') {
            [userList] = await pool.query('SELECT id, principal_name FROM users WHERE role = "principal" AND is_approved = TRUE');
            [attendance] = await pool.query('SELECT * FROM attendance_data WHERE date = ? AND finalized = 1', [targetDate]);
        } else {
            const [users] = await pool.query('SELECT id, principal_name FROM users WHERE id = ?', [req.user.id]);
            userList = users;
            [attendance] = await pool.query('SELECT * FROM attendance_data WHERE principal_id = ? AND date = ?', [req.user.id, targetDate]);
        }
        
        if (userList.length === 0) return res.status(404).send('No data found');

        const path = require('path');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
        const formatSheet = workbook.getWorksheet('Format-Blr');
        
        const dateParts = targetDate.split('-');
        let formattedDateForFile = targetDate;
        if (dateParts.length === 3) {
            // Convert YYYY-MM-DD to DD-MM-YYYY for the filename
            if (dateParts[0].length === 4) {
                formattedDateForFile = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }
        }
        
        // Helper to convert col index to letter
        const getCol = (idx) => {
            let letter = '';
            while (idx > 0) {
                let mod = (idx - 1) % 26;
                letter = String.fromCharCode(65 + mod) + letter;
                idx = Math.floor((idx - mod) / 26);
            }
            return letter;
        };

        const inputCols = [
            5,6,7,8, 12,13,14,15, 19,20,21,22, 26,27,28,29, 33,34,35,36, 
            40,41,42,43, 47,48,49,50, 54,55,56,57, 61,62,63,64, 68,69,70,71,
            84,85, 87,88, 90,91, 93,94, 104,105
        ];

        // Populate Format-Blr
        for (const user of userList) {
            const campusName = user.principal_name.toUpperCase();
            const userAttendance = attendance.filter(a => a.principal_id === user.id);
            
            const findRowIdx = (start, count) => {
                for (let r = start; r < start + count; r++) {
                    const row = formatSheet.getRow(r);
                    if (row.getCell(2).text.toUpperCase() === campusName) return r;
                }
                return null;
            };

            const incRowIdx = findRowIdx(7, 38);
            const outRowIdx = findRowIdx(51, 38);

            if (incRowIdx) {
                const row = formatSheet.getRow(incRowIdx);
                // Clear row's inputs first
                inputCols.forEach(c => row.getCell(c).value = 0);

                userAttendance.filter(a => a.branch === 'INCOMING SENIORS').forEach(item => {
                    const baseCol = consolidatedMapping["INCOMING SENIORS"]?.[item.stream];
                    if (baseCol) {
                        row.getCell(baseCol).value = item.cbse_strength || 0;
                        row.getCell(baseCol + 1).value = item.cbse_present || 0;
                        row.getCell(baseCol + 2).value = item.pu_strength || 0;
                        row.getCell(baseCol + 3).value = item.pu_present || 0;
                    }
                });
                
                userAttendance.filter(a => a.branch === 'CO-IPL').forEach(item => {
                    let col = null;
                    const sName = item.stream?.toUpperCase() || "";
                    if (sName.includes('7TH')) col = 84;
                    else if (sName.includes('8TH')) col = 87;
                    else if (sName.includes('9TH')) col = 90;
                    else if (sName.includes('10TH')) col = 93;
                    
                    if (col) {
                        row.getCell(col).value = item.strength || 0;
                        row.getCell(col + 1).value = item.present || 0;
                    }
                });
                
                userAttendance.filter(a => a.branch === 'LTC-VAIDYAH').forEach(item => {
                    row.getCell(104).value = item.strength || 0;
                    row.getCell(105).value = item.present || 0;
                });
            }

            if (outRowIdx) {
                const row = formatSheet.getRow(outRowIdx);
                // Clear row's inputs first
                inputCols.forEach(c => row.getCell(c).value = 0);

                userAttendance.filter(a => a.branch === 'OUTGOING SENIORS').forEach(item => {
                    const baseCol = consolidatedMapping["OUTGOING SENIORS"]?.[item.stream];
                    if (baseCol) {
                        row.getCell(baseCol).value = item.cbse_strength || 0;
                        row.getCell(baseCol + 1).value = item.cbse_present || 0;
                        row.getCell(baseCol + 2).value = item.pu_strength || 0;
                        row.getCell(baseCol + 3).value = item.pu_present || 0;
                    }
                });
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${formattedDateForFile}_STREAM-WISE_DAILY_ATTENDANCE.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

const port = process.env.PORT || 3002;
app.listen(port, () => console.log(`Server running on port ${port}`));
