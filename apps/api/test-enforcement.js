async function main() {
  // Login as superadmin
  const loginResp = await fetch('http://localhost:4011/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@properp.local', password: 'SuperAdmin@123' }),
  });
  const loginData = await loginResp.json();
  const token = loginData.data.tokens.accessToken;
  console.log('Superadmin token obtained');

  // Suspend Test Builders org
  const suspendResp = await fetch('http://localhost:4011/api/v1/saas-admin/organizations/96d1dc2d-bb57-4240-8bff-27ab0c873cf0/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });
  const suspendData = await suspendResp.json();
  console.log('Suspend result:', JSON.stringify(suspendData, null, 2));

  // Now try login as john@example.com
  const johnLogin = await fetch('http://localhost:4011/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'john@example.com', password: 'Passw0rd1' }),
  });
  const johnData = await johnLogin.json();
  console.log('John login result:', JSON.stringify(johnData, null, 2));
}

main().catch(console.error);