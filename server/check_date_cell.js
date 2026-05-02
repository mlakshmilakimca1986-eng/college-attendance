const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('Format-Blr');
    
    for (let c = 1; c <= 100; c++) {
        const val = sheet.getRow(2).getCell(c).value;
        if (val && typeof val === 'string' && val.includes('Date:')) {
            console.log(`Date found at Column ${c}: "${val}"`);
        }
    }
}

check();
