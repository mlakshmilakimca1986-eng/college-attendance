const ExcelJS = require('exceljs');
const path = require('path');

async function findText() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    
    workbook.worksheets.forEach(sheet => {
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value && typeof cell.value === 'string' && cell.value.includes('LONG TERM')) {
                    console.log(`Sheet: ${sheet.name}, Row: ${rowNumber}, Col: ${colNumber} (${sheet.getColumn(colNumber).letter}), Value: ${cell.value}`);
                }
                if (cell.value && typeof cell.value === 'string' && cell.value.includes('VAIDYAH')) {
                    console.log(`Sheet: ${sheet.name}, Row: ${rowNumber}, Col: ${colNumber} (${sheet.getColumn(colNumber).letter}), Value: ${cell.value}`);
                }
            });
        });
    });
}
findText().catch(console.error);
