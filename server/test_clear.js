const ExcelJS = require('exceljs');
const path = require('path');

async function test() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    const formatSheet = workbook.getWorksheet('Format-Blr');
    const streamWiseSheet = workbook.getWorksheet('STREAM WISE');
    
    console.log('Before clearing:');
    console.log('Format-Blr row 7 col 5:', formatSheet.getRow(7).getCell(5).value);
    console.log('STREAM WISE row 7 col 5:', streamWiseSheet.getRow(7).getCell(5).value);
    
    // Clear
    formatSheet.getRow(7).getCell(5).value = 0;
    
    console.log('After clearing:');
    console.log('Format-Blr row 7 col 5:', formatSheet.getRow(7).getCell(5).value);
    console.log('STREAM WISE row 7 col 5 (should be 0 or formula):', streamWiseSheet.getRow(7).getCell(5).value);
}

test();
