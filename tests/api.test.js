const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');
process.env.PORT='0';
process.env.DEMO_STUDENT_PASSWORD=crypto.randomBytes(18).toString('base64url');
process.env.DEMO_ADMIN_PASSWORD=crypto.randomBytes(18).toString('base64url');
process.env.DATA_FILE='./data/test-db.json';
try { fs.unlinkSync(require('path').resolve(__dirname,'..','data','test-db.json')); } catch {}
const {server}=require('../server');

async function request(base,path,options={}){const res=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});return {status:res.status,data:await res.json()}}
server.listen(0,'127.0.0.1',async()=>{
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const bad=await request(base,'/api/auth/login',{method:'POST',body:JSON.stringify({email:'estudiante@universidad.mx',password:crypto.randomBytes(18).toString('base64url')})});assert.equal(bad.status,401);
    const login=await request(base,'/api/auth/login',{method:'POST',body:JSON.stringify({email:'estudiante@universidad.mx',password:process.env.DEMO_STUDENT_PASSWORD})});assert.equal(login.status,200);assert.ok(login.data.token);
    const auth={Authorization:`Bearer ${login.data.token}`};
    const list=await request(base,'/api/reports',{headers:auth});assert.equal(list.status,200);assert.ok(Array.isArray(list.data.items));
    const created=await request(base,'/api/reports',{method:'POST',headers:auth,body:JSON.stringify({category:'Iluminación',priority:'Alta',building:'Edificio B',location:'B-101',title:'Lámpara dañada',description:'La lámpara del aula parpadea constantemente.'})});assert.equal(created.status,201);
    const forbidden=await request(base,'/api/reports/r3',{headers:auth});assert.equal(forbidden.status,403);
    console.log('5 pruebas de API completadas correctamente');
  }catch(e){console.error(e);process.exitCode=1}finally{server.close()}
});
