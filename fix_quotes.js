const fs = require('fs');
const files = [
    'F:/Projects/CO Attendance/client/src/components/PrincipalDashboard.jsx',
    'F:/Projects/CO Attendance/client/src/components/AuthPage.jsx',
    'F:/Projects/CO Attendance/client/src/components/AdminDashboard.jsx'
];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Replace '...${...}...' or "..." with `...${...}...`
    let lines = content.split('\n');
    let fixed = lines.map(line => {
        if (line.includes('import.meta.env.VITE_API_BASE_URL')) {
            // Check if the current line starts the string with ' or "
            // The simplest way without complex regex: simply convert all single and double quotes to backticks on that string
            line = line.replace(/('|\")(\\\${import\.meta\.env\.VITE_API_BASE_URL.*?)(\1)/g, '`\$2`');
            // But sometimes the string already has backticks due to existing templates, so only target ' and " wrappers
            line = line.replace(/'\$\{import\.meta\.env\.VITE_API_BASE_URL/g, '`${import.meta.env.VITE_API_BASE_URL');
            line = line.replace(/"\$\{import\.meta\.env\.VITE_API_BASE_URL/g, '`${import.meta.env.VITE_API_BASE_URL');
            // Fix trailing quote: this is trickier to reliably pinpoint without executing standard regex, let's just do a manual replace for the known lines:
        }
        return line;
    });
    
    // Actually, letting let's just write a global regex replace to fix any `'${import...}'` or `"${import...}"`
    let finalContent = fixed.join('\n');
    finalContent = finalContent.replace(/'(\$\{import\.meta\.env\.VITE_API_BASE_URL[^']*?)'/g, '`$1`');
    finalContent = finalContent.replace(/"(\$\{import\.meta\.env\.VITE_API_BASE_URL[^"]*?)"/g, '`$1`');

    fs.writeFileSync(f, finalContent);
});
