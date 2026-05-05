const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('Format-Blr');
    const row = sheet.getRow(7);
    console.log('Row 7, Cols 19-25:');
    for (let i = 19; i <= 25; i++) {
        const cell = row.getCell(i);
        console.log(`Col ${i} (${cell.address.replace(/[0-9]/g, '')}): ${cell.formula ? 'FORMULA: ' + cell.formula : 'VALUE: ' + cell.value}`);
    }
}
check();
