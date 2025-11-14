(async ()=>{
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@testenv.com', password: 'Admin@123' })
    });

    const l = await login.json();
    const token = l.token;
    console.log('Token length:', token ? token.length : 'none');

    const resp = await fetch('http://localhost:5000/api/analytics/conflicts/2/resolve', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ resolution_notes: 'Resolved programmatically via patch' })
    });

    const body = await resp.json();
    console.log('HTTP', resp.status, JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
