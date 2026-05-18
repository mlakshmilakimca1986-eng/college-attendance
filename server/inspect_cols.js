const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const sheet = workbook.getWorksheet('Format-Blr');
    if (!sheet) {
        console.log('No Format-Blr sheet found');
        return;
    }
    
    // We want to see what headers are in columns 80 to 100 on row 3, 4, 5, 6
    for (let c = 80; c <= 100; c++) {
        const val4 = sheet.getCell(4, c).value;
        const val5 = sheet.getCell(5, c).value;
        const val6 = sheet.getCell(6, c).value;
        if (val4 || val5 || val6) {
            console.log(`Col ${c} (Col Name ${sheet.getColumn(c).letter}): Row 4: ${val4}, Row 5: ${val5}, Row 6: ${val6}`);
        }
    }
}
inspect().catch(console.error);
