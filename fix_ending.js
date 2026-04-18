const fs = require('fs');
const files = [
    'F:/Projects/CO Attendance/client/src/components/PrincipalDashboard.jsx',
    'F:/Projects/CO Attendance/client/src/components/AuthPage.jsx',
    'F:/Projects/CO Attendance/client/src/components/AdminDashboard.jsx'
];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // We want to find:
    // \`\${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}   followed by NOT a backtick until a ' or "
    // e.g. `${...}/api/save' -> `${...}/api/save`
    
    // Pattern: 
    // Group 1: `\${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}
    // Group 2: any characters that are not ', ", or `
    // Group 3: ' or "
    content = content.replace(/(`\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| 'http:\/\/localhost:3002'\}[^`'"]*)['"]/g, '$1`');

    fs.writeFileSync(f, content);
});
