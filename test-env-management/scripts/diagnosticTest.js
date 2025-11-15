(async () => {
  try {
    // Login as admin
    const loginResp = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@testenv.com', password: 'Admin@123' })
    });

    const loginData = await loginResp.json();
    const token = loginData.token;
    console.log('✓ Logged in as admin');

    // Call diagnostic endpoint
    const diagResp = await fetch('http://localhost:5000/api/diagnostic/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const diagData = await diagResp.json();
    
    console.log('\n=== DIAGNOSTIC RESULTS ===\n');
    console.log(`Timestamp: ${diagData.timestamp}`);
    console.log(`User: ${diagData.user.role} (ID: ${diagData.user.id})`);
    console.log(`\nSummary: ${diagData.summary.success}/${diagData.summary.total} checks passed`);
    console.log(`Overall Status: ${diagData.summary.overallStatus}\n`);

    console.log('Detailed Checks:');
    console.log('─'.repeat(80));
    
    for (const [checkName, result] of Object.entries(diagData.checks)) {
      const icon = result.status === 'OK' ? '✓' : '✗';
      const status = result.status === 'OK' ? 'OK' : `ERROR: ${result.error}`;
      console.log(`${icon} ${checkName.padEnd(30)} ${status}`);
      
      if (result.status === 'ERROR') {
        if (result.sqlState) console.log(`  SQL State: ${result.sqlState}`);
        if (result.errno) console.log(`  Error Number: ${result.errno}`);
      } else if (result.data) {
        console.log(`  Data:`, JSON.stringify(result.data, null, 2));
      } else if (result.count !== undefined) {
        console.log(`  Count: ${result.count}`);
      }
      console.log('');
    }
    
    console.log('─'.repeat(80));
    
    if (diagData.summary.errors > 0) {
      console.log(`\n⚠ ${diagData.summary.errors} error(s) detected. See details above.`);
      process.exit(1);
    } else {
      console.log('\n✓ All dashboard data sources are healthy!');
      process.exit(0);
    }
    
  } catch (err) {
    console.error('Diagnostic test failed:', err.message);
    if (err.cause) console.error('Cause:', err.cause);
    process.exit(1);
  }
})();
