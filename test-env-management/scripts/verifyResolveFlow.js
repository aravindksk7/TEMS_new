(async ()=>{
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@testenv.com', password: 'Admin@123' })
    });

    const l = await login.json();
    const token = l.token;

    // Query activities to see the logged conflict resolution
    const resp = await fetch('http://localhost:5000/api/analytics/utilization', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });

    const body = await resp.json();
    console.log('Analytics utilization check (verifies auth):', resp.status);

    // Resolve another conflict (using 1 which should also be unresolved)
    const resolve = await fetch('http://localhost:5000/api/analytics/conflicts/1/resolve', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ resolution_notes: 'Resolved with metadata logging' })
    });

    const resolveBody = await resolve.json();
    console.log('Resolve conflict 1:', resolve.status, JSON.stringify(resolveBody, null, 2));

    // Get conflicts again to verify resolution_status
    const conflicts = await fetch('http://localhost:5000/api/analytics/conflicts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });

    const conflictBody = await conflicts.json();
    console.log('Conflicts after resolution:');
    console.log('  Unresolved count:', conflictBody.conflictDetails.filter(c => c.resolution_status === 'unresolved').length);
    console.log('  Details:', JSON.stringify(conflictBody.conflictDetails, null, 2));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
