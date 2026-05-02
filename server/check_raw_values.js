const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('STREAM WISE');
    const row7 = sheet.getRow(7);
    for (let i = 5; i <= 70; i++) {
        const cell = row7.getCell(i);
        if (cell.value !== null && typeof cell.value !== 'object') {
             console.log(`Col ${i} has raw value: "${cell.value}"`);
        }
    }
}

check();
