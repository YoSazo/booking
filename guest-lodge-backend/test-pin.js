const fs = require('fs');
const path = require('path');
const serverCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const match = serverCode.match(/const CRM_TOKEN_HOTELS_JSON = (.*?);/);
console.log(match ? match[0] : 'not found');
