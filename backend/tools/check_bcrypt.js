(async ()=>{
  try{
    const pool = require('../config/database');
    const bcrypt = require('bcryptjs');
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@tems.com']);
    if(!rows || rows.length === 0){
      console.log('no user found');
      return;
    }
    const user = rows[0];
    console.log('db password:', user.password);
    const ok = await bcrypt.compare('admin123', user.password);
    console.log('bcrypt compare result:', ok);
  }catch(e){
    console.error('error', e);
  }finally{
    process.exit();
  }
})();
