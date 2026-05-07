const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    console.time('Read-Template');
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    console.timeEnd('Read-Template');
    const sheet = workbook.getWorksheet('Format-Blr');
    console.log('Used Range:', sheet.dimensions);
    console.log('Row Count:', sheet.rowCount);
    console.log('Actual Row Count:', sheet.actualRowCount);
}
check();
