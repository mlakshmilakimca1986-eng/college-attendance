const fs = require('fs');
const files = [
    'F:/Projects/CO Attendance/client/src/components/PrincipalDashboard.jsx',
    'F:/Projects/CO Attendance/client/src/components/AuthPage.jsx',
    'F:/Projects/CO Attendance/client/src/components/AdminDashboard.jsx'
];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');

    // This targets exactly the botched injections from the first replace script.
    // 'http://localhost:3002 was replaced directly, resulting in things like:
    // '${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/...'
    
    // We will find all instances of import.meta.env.VITE_API_BASE_URL and fix the surrounding context.
    
    // Let's just find that entire chunk safely and convert to backticks.
    content = content.replace(/'\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| 'http:\/\/localhost:3002'\}([^']*)'/g, '`${import.meta.env.VITE_API_BASE_URL || \'http://localhost:3002\'}$1`');
    content = content.replace(/"\$\{import\.meta\.env\.VITE_API_BASE_URL \|\| 'http:\/\/localhost:3002'\}([^"]*)"/g, '`${import.meta.env.VITE_API_BASE_URL || \'http://localhost:3002\'}$1`');
    
    // Wait, the inner string has single quotes `|| 'http://localhost:3002'` which creates syntax errors if the outer is also single quotes without escaping.
    // My VERY FIRST script did: .replace(/http:\/\/localhost:3002/g, "\${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}")
    
    // So if the code originally was: 'http://localhost:3002/api'
    // It became: '${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api'
    // That means:
    // Outer quote 1: '
    // Inner text: ${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}
    // Rest of path: /api'
    // The javascript parser sees EXACTLY:
    // String 1: '${import.meta.env.VITE_API_BASE_URL || '
    // Identifier: http
    // Error! Expected `,` or `)` but found `Identifier`
    
    content = content.replace(/'\$\{import\.meta\.env\.VITE_API_BASE_URL\ \|\|\ 'http:\/\/localhost:3002'\}([^']*)'/g, '`${import.meta.env.VITE_API_BASE_URL || \'http://localhost:3002\'}$1`');
    content = content.replace(/"\$\{import\.meta\.env\.VITE_API_BASE_URL\ \|\|\ 'http:\/\/localhost:3002'\}([^"]*)"/g, '`${import.meta.env.VITE_API_BASE_URL || \'http://localhost:3002\'}$1`');

    fs.writeFileSync(f, content);
});
