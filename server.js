const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = path.resolve(__dirname, process.env.DATA_FILE || 'data/db.json');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('base64url');
const loginAttempts = new Map();

const base64url = input => Buffer.from(input).toString('base64url');
const hashPassword = (password, salt) => crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
function signToken(user) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: user.id, role: user.role, exp: Math.floor(Date.now()/1000)+60*60*8 }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Math.floor(Date.now()/1000) ? data : null;
  } catch { return null; }
}
function seed() {
  const studentPassword = process.env.DEMO_STUDENT_PASSWORD || crypto.randomBytes(24).toString('base64url');
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || crypto.randomBytes(24).toString('base64url');
  const users = [
    { id:'u1', name:'Joel Lara', email:'estudiante@universidad.mx', role:'student', salt:crypto.randomBytes(16).toString('hex'), password:studentPassword },
    { id:'u2', name:'Coordinación de Mantenimiento', email:'admin@universidad.mx', role:'admin', salt:crypto.randomBytes(16).toString('hex'), password:adminPassword }
  ].map(u => ({...u, passwordHash:hashPassword(u.password,u.salt), password:undefined}));
  const now = Date.now();
  return { users, nextReport:4, reports:[
    {id:'r1',folio:'MAN-2026-0001',ownerId:'u1',ownerName:'Joel Lara',category:'Internet',priority:'Alta',building:'Biblioteca',location:'Sala de consulta',title:'Red inalámbrica sin conexión',description:'Los equipos de la sala no pueden conectarse a la red institucional.',photo:null,status:'En proceso',createdAt:new Date(now-86400000*2).toISOString(),history:[{action:'Reporte registrado',date:new Date(now-86400000*2).toISOString(),by:'Joel Lara'},{action:'Estado cambiado a En revisión',date:new Date(now-86400000*1.5).toISOString(),by:'Coordinación de Mantenimiento'},{action:'Estado cambiado a En proceso',date:new Date(now-86400000).toISOString(),by:'Coordinación de Mantenimiento',comment:'Se asignó la revisión al área de redes.'}]},
    {id:'r2',folio:'MAN-2026-0002',ownerId:'u1',ownerName:'Joel Lara',category:'Iluminación',priority:'Media',building:'Edificio A',location:'Aula A-204',title:'Lámpara principal apagada',description:'La lámpara del centro del aula no enciende y reduce la visibilidad.',photo:null,status:'Recibido',createdAt:new Date(now-86400000).toISOString(),history:[{action:'Reporte registrado',date:new Date(now-86400000).toISOString(),by:'Joel Lara'}]},
    {id:'r3',folio:'MAN-2026-0003',ownerId:'u2',ownerName:'Coordinación de Mantenimiento',category:'Mobiliario',priority:'Baja',building:'Rectoría',location:'Sala de juntas',title:'Silla con respaldo flojo',description:'Una de las sillas presenta movimiento en el respaldo.',photo:null,status:'Resuelto',createdAt:new Date(now-86400000*5).toISOString(),history:[{action:'Reporte registrado',date:new Date(now-86400000*5).toISOString(),by:'Coordinación de Mantenimiento'},{action:'Estado cambiado a Resuelto',date:new Date(now-86400000*4).toISOString(),by:'Coordinación de Mantenimiento',comment:'Se ajustaron y verificaron los tornillos.'}]}
  ]};
}
function loadDb(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch{const db=seed();saveDb(db);return db}}
function saveDb(db){fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2))}
let db = loadDb();

function send(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>3_000_000){reject(new Error('PAYLOAD_TOO_LARGE'));req.destroy()}});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('JSON_INVALID'))}});req.on('error',reject)})}
function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role}}
function auth(req){const value=req.headers.authorization||'';const token=value.startsWith('Bearer ')?value.slice(7):'';const payload=verifyToken(token);if(!payload)return null;return db.users.find(u=>u.id===payload.sub)||null}
function clean(value,max=200){return String(value||'').trim().replace(/[<>]/g,'').slice(0,max)}
function canSee(user,report){return user.role==='admin'||report.ownerId===user.id}
const allowedStatus=['Recibido','En revisión','En proceso','Resuelto'];
const allowedPriority=['Baja','Media','Alta','Urgente'];
const allowedCategory=['Equipo de cómputo','Iluminación','Mobiliario','Internet','Instalación eléctrica','Agua y sanitarios','Otro'];

async function api(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{status:'ok',service:'Mantenimiento U',time:new Date().toISOString()});
  if(req.method==='POST'&&url.pathname==='/api/auth/login'){
    const ip=req.socket.remoteAddress||'unknown';const recent=(loginAttempts.get(ip)||[]).filter(t=>Date.now()-t<60000);if(recent.length>=8)return send(res,429,{error:'Demasiados intentos. Espera un minuto.'});
    const data=await body(req);const email=clean(data.email,120).toLowerCase();const password=String(data.password||'');const user=db.users.find(u=>u.email===email);const valid=user&&password.length<=72&&crypto.timingSafeEqual(Buffer.from(hashPassword(password,user.salt)),Buffer.from(user.passwordHash));
    if(!valid){recent.push(Date.now());loginAttempts.set(ip,recent);return send(res,401,{error:'Correo o contraseña incorrectos'});}loginAttempts.delete(ip);return send(res,200,{token:signToken(user),user:publicUser(user)});
  }
  const user=auth(req);if(!user)return send(res,401,{error:'Token ausente, inválido o expirado'});
  if(req.method==='GET'&&url.pathname==='/api/auth/me')return send(res,200,publicUser(user));
  if(req.method==='GET'&&url.pathname==='/api/reports'){
    const reports=db.reports.filter(r=>canSee(user,r)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));return send(res,200,{items:reports.map(({photo,...r})=>({...r,hasPhoto:Boolean(photo)})),total:reports.length});
  }
  if(req.method==='POST'&&url.pathname==='/api/reports'){
    const data=await body(req);const required=['category','priority','building','location','title','description'];for(const field of required)if(!clean(data[field]))return send(res,400,{error:`El campo ${field} es obligatorio`});
    if(!allowedCategory.includes(data.category)||!allowedPriority.includes(data.priority))return send(res,400,{error:'Categoría o prioridad no válida'});
    if(clean(data.title,100).length<5||clean(data.description,600).length<10)return send(res,400,{error:'El título o la descripción son demasiado cortos'});
    if(data.photo&&(!String(data.photo).startsWith('data:image/')||String(data.photo).length>2_800_000))return send(res,400,{error:'La evidencia fotográfica no es válida o supera 2 MB'});
    const n=db.nextReport++;const report={id:`r${n}`,folio:`MAN-2026-${String(n).padStart(4,'0')}`,ownerId:user.id,ownerName:user.name,category:data.category,priority:data.priority,building:clean(data.building,80),location:clean(data.location,80),title:clean(data.title,100),description:clean(data.description,600),photo:data.photo||null,status:'Recibido',createdAt:new Date().toISOString(),history:[{action:'Reporte registrado',date:new Date().toISOString(),by:user.name}]};db.reports.push(report);saveDb(db);return send(res,201,{id:report.id,folio:report.folio,status:report.status});
  }
  const match=url.pathname.match(/^\/api\/reports\/([^/]+)$/);
  if(req.method==='GET'&&match){const report=db.reports.find(r=>r.id===match[1]);if(!report)return send(res,404,{error:'Reporte no encontrado'});if(!canSee(user,report))return send(res,403,{error:'No tienes permiso para consultar este reporte'});return send(res,200,report)}
  const statusMatch=url.pathname.match(/^\/api\/reports\/([^/]+)\/status$/);
  if(req.method==='PATCH'&&statusMatch){if(user.role!=='admin')return send(res,403,{error:'Operación exclusiva para administradores'});const report=db.reports.find(r=>r.id===statusMatch[1]);if(!report)return send(res,404,{error:'Reporte no encontrado'});const data=await body(req);if(!allowedStatus.includes(data.status))return send(res,400,{error:'Estado no válido'});report.status=data.status;report.history.push({action:`Estado cambiado a ${data.status}`,date:new Date().toISOString(),by:user.name});saveDb(db);return send(res,200,{message:'Estado actualizado',status:report.status})}
  const commentMatch=url.pathname.match(/^\/api\/reports\/([^/]+)\/comments$/);
  if(req.method==='POST'&&commentMatch){if(user.role!=='admin')return send(res,403,{error:'Operación exclusiva para administradores'});const report=db.reports.find(r=>r.id===commentMatch[1]);if(!report)return send(res,404,{error:'Reporte no encontrado'});const data=await body(req);const comment=clean(data.comment,300);if(comment.length<3)return send(res,400,{error:'Comentario no válido'});report.history.push({action:'Comentario de seguimiento',comment,date:new Date().toISOString(),by:user.name});saveDb(db);return send(res,201,{message:'Comentario agregado'})}
  if(req.method==='GET'&&url.pathname==='/api/dashboard'){const reports=db.reports.filter(r=>canSee(user,r));return send(res,200,{total:reports.length,inProgress:reports.filter(r=>['En revisión','En proceso'].includes(r.status)).length,resolved:reports.filter(r=>r.status==='Resuelto').length,urgent:reports.filter(r=>r.priority==='Urgente').length})}
  return send(res,404,{error:'Endpoint no encontrado'});
}
function serveStatic(req,res,url){let file=url.pathname==='/'?'index.html':url.pathname.slice(1);file=path.normalize(file).replace(/^(\.\.[/\\])+/, '');const target=path.join(PUBLIC,file);if(!target.startsWith(PUBLIC))return send(res,403,{error:'Acceso denegado'});fs.readFile(target,(err,data)=>{if(err){if(!path.extname(file))return fs.readFile(path.join(PUBLIC,'index.html'),(e,d)=>{if(e)return send(res,404,{error:'Archivo no encontrado'});res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});return send(res,404,{error:'Archivo no encontrado'});}const ext=path.extname(target);const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':ext==='.html'?'no-store':'public, max-age=3600'});res.end(data)})}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);const mobilePreview=url.pathname.startsWith('/mobile/')||url.pathname.startsWith('/_expo/');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(self)');res.setHeader('Content-Security-Policy',`default-src 'self'; img-src 'self' data: blob:; style-src 'self'${mobilePreview?" 'unsafe-inline'":''}; script-src 'self'; connect-src 'self'`);try{if(url.pathname.startsWith('/api/'))return await api(req,res,url);return serveStatic(req,res,url)}catch(e){if(!res.headersSent)send(res,e.message==='PAYLOAD_TOO_LARGE'?413:400,{error:e.message==='JSON_INVALID'?'JSON no válido':'No fue posible procesar la solicitud'})}});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log(`Mantenimiento U disponible en http://localhost:${PORT}`));
module.exports={server,seed,hashPassword,signToken,verifyToken};
