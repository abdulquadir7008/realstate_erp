const { execSync } = require('child_process');
try {
  const result = execSync('cd F:\\AI_Project\\realstate_erp\\apps\\api && pnpm test -- qhse-analytics/ finance-analytics/ hr-analytics/ field-ops-analytics/ project-analytics/ 2>&1', { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  console.log(result);
} catch (e) {
  console.error(e.stdout || e.stderr);
}