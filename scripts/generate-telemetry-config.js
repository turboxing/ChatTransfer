const fs = require('fs');
const path = require('path');

const apiKey = String(process.env.TELEMETRY_API_KEY || '').trim();
if (!apiKey) {
  console.error('TELEMETRY_API_KEY is required to build official packages');
  process.exit(1);
}

const configPath = path.resolve(__dirname, '../config/default-analytics.json');
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `${JSON.stringify({
  analytics: {
    enabled: true,
    apiKey
  }
}, null, 2)}\n`, 'utf8');
console.log(`Generated ${configPath}`);
