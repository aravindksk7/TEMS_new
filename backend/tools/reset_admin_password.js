(async ()=>{
  try{
    const pool = require('../config/database');
    const bcrypt = require('bcryptjs');
    const pw = 'admin123';
    const hash = await bcrypt.hash(pw, 10);
    console.log('new hash', hash);
    const [res] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hash, 'admin@tems.com']);
    console.log('update result', res.affectedRows);
  }catch(e){
    console.error('error', e);
  }finally{
    process.exit();
  }
})();
