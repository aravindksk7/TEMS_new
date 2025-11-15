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

    // Get my bookings
    const my = await fetch('http://localhost:5000/api/bookings/my-bookings', {
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    });
    const myBody = await my.json();
    console.log('My bookings count:', myBody.bookings.length);
    if (myBody.bookings.length === 0) return console.log('No bookings to delete');

    // pick first non-active booking
    const candidate = myBody.bookings.find(b => b.status !== 'active') || myBody.bookings[0];
    console.log('Deleting booking id:', candidate.id, 'status:', candidate.status);

    const del = await fetch('http://localhost:5000/api/bookings/' + candidate.id, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    const delBody = await del.json();
    console.log('Delete status:', del.status, JSON.stringify(delBody, null,2));

    // Fetch again
    const my2 = await fetch('http://localhost:5000/api/bookings/my-bookings', {
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    });
    const myBody2 = await my2.json();
    console.log('My bookings after delete count:', myBody2.bookings.length);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
