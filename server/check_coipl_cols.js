const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('Format-Blr');
    const row7 = sheet.getRow(7);
    for (let i = 84; i <= 95; i++) {
        console.log(`Col ${i}: "${row7.getCell(i).value}"`);
    }
}

check();
