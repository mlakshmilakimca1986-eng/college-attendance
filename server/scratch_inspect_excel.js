const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('Format-Blr');
    if (!sheet) {
        console.log('Sheet not found');
        return;
    }

    const row = sheet.getRow(7);
    console.log('Row 7 Cells:');
    for (let i = 1; i <= 110; i++) {
        const cell = row.getCell(i);
        if (cell.formula) {
            console.log(`Col ${i} (${cell.address.replace(/[0-9]/g, '')}): FORMULA -> ${cell.formula}`);
        } else if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            console.log(`Col ${i} (${cell.address.replace(/[0-9]/g, '')}): VALUE -> ${cell.value}`);
        }
    }
}
check();
