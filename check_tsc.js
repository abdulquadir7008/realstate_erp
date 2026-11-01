const { execSync } = require('child_process');
try {
  const result = execSync('cmd /c "cd F:\\AI_Project\\realstate_erp\\apps\\api && ./node_modules/.bin/tsc --noEmit"', { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  console.log(result);
} catch (e) {
  console.error(e.stdout || e.stderr);
}