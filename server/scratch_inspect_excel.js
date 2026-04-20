const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.readFile(path.join(__dirname, '..', '18-04-2026_STREAM-WISE_DAILY_ATTENDANCE@Updated.xlsx'));
        const sheet = workbook.getWorksheet('Format-Blr');
        
        console.log('Worksheet:', sheet.name);
        
        const row6 = sheet.getRow(6);
        for (let i = 1; i <= 100; i++) {
            const val = row6.getCell(i).text || '';
            if(val) {
               console.log(`Col ${i}: Field="${val}"`);
            }
        }

    } catch (e) {
        console.error('Error reading Excel:', e);
    }
}

inspect();
