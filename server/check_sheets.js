const ExcelJS = require('exceljs');
const path = require('path');

async function check() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, 'template_consolidated.xlsx'));
    console.log('Sheets:', workbook.worksheets.map(s => s.name));
}

check();
