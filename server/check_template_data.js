const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    
    workbook.worksheets.forEach(sheet => {
        console.log(`Sheet: ${sheet.name}`);
        const row7 = sheet.getRow(7);
        console.log(`  Row 7, Col 2 (Campus): "${row7.getCell(2).value}"`);
        console.log(`  Row 7, Col 5 (Data): "${row7.getCell(5).value}"`);
    });
}

check();
