/* Servidor local para la página, métricas agregadas y reportes semanales por SMTP. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const SECTION_LABELS = { inicio: 'Inicio', historia: 'Historia', relatos: 'Relatos', podcast: 'Podcast', recursos: 'Autodiagnóstico y Kit de Vida Digital Sana' };
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.mp3':'audio/mpeg','.woff2':'font/woff2','.ttf':'font/ttf' };

function loadEnv() {
  const envPath=path.join(ROOT,'.env'); if(!fs.existsSync(envPath)) return;
  for(const raw of fs.readFileSync(envPath,'utf8').split(/\r?\n/)) { const line=raw.trim(); if(!line||line.startsWith('#')) continue; const p=line.indexOf('='); if(p<1) continue; const key=line.slice(0,p).trim(); let value=line.slice(p+1).trim(); if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1); if(!process.env[key]) process.env[key]=value; }
}
loadEnv();
const emptyData=()=>({version:1,updatedAt:new Date().toISOString(),visits:0,likes:0,dislikes:0,sections:Object.fromEntries(Object.keys(SECTION_LABELS).map(id=>[id,{views:0,seconds:0}])),days:{}});
function loadData(){try{const d=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); if(d.version===1&&d.sections&&d.days) return d;}catch{} return emptyData();}
let data=loadData();
const analyticsClients=new Set();
function analyticsPayload(){const todayData=dayBucket();const sections=Object.fromEntries(Object.keys(SECTION_LABELS).map(id=>[id,{views:data.sections[id]?.views||0}]));return {updatedAt:data.updatedAt,visits:data.visits,todayVisits:todayData.visits,likes:data.likes,dislikes:data.dislikes,sections};}
function broadcastAnalytics(){const message=`data: ${JSON.stringify(analyticsPayload())}\n\n`;for(const client of analyticsClients){try{client.write(message);}catch{analyticsClients.delete(client);}}}
function persist(){data.updatedAt=new Date().toISOString();fs.mkdirSync(DATA_DIR,{recursive:true});const temp=DATA_FILE+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2));fs.renameSync(temp,DATA_FILE);broadcastAnalytics();}
function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return`${v.year}-${v.month}-${v.day}`;}
function dayBucket(date=today()){if(!data.days[date])data.days[date]={visits:0,likes:0,dislikes:0,sections:Object.fromEntries(Object.keys(SECTION_LABELS).map(id=>[id,{views:0,seconds:0}]))};return data.days[date];}
function validSession(id){return typeof id==='string'&&id.length>=8&&id.length<=100;}
function validSection(id){return Object.hasOwn(SECTION_LABELS,id);}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>8192){reject(new Error('too-large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'));}catch{reject(new Error('invalid-json'));}});req.on('error',reject);});}
function sevenDaySummary(){const [year,month,dayNumber]=today().split('-').map(Number);const base=Date.UTC(year,month-1,dayNumber);const dates=[];for(let i=6;i>=0;i--)dates.push(new Date(base-i*86400000).toISOString().slice(0,10));const result={visits:0,likes:0,dislikes:0,sections:Object.fromEntries(Object.keys(SECTION_LABELS).map(id=>[id,{views:0,seconds:0}]))};for(const date of dates){const day=data.days[date];if(!day)continue;result.visits+=day.visits;result.likes+=day.likes;result.dislikes+=day.dislikes;for(const id of Object.keys(SECTION_LABELS)){result.sections[id].views+=day.sections[id].views;result.sections[id].seconds+=day.sections[id].seconds;}}return{dates,summary:result};}
async function sendWeeklyReport(){
  const {REPORT_EMAIL,SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS}=process.env;
  if(!REPORT_EMAIL||!SMTP_HOST||!SMTP_USER||!SMTP_PASS){console.warn('Informe semanal no enviado: falta configurar REPORT_EMAIL y los datos SMTP en .env.');return;}
  const nodemailer=require('nodemailer');
  const {dates,summary}=sevenDaySummary();
  const sectionLines=Object.entries(SECTION_LABELS).map(([id,label])=>{const s=summary.sections[id];const reach=summary.visits?Math.min(100,s.views/summary.visits*100):0;return `• ${label}: ${s.views} visitas al apartado · ${reach.toFixed(1)}% de alcance`;}).join('\n');
  const text=`Reporte semanal de actividad — Espejos Digitales\nPeriodo (hora Colombia): ${dates[0]} a ${dates[6]}\n\nVisitas a la página: ${summary.visits}\nMe gusta: ${summary.likes}\nNo me gusta: ${summary.dislikes}\n\nVisitas por apartado y alcance del recorrido:\n${sectionLines}\n\nDatos agregados y anónimos. No se almacenan nombres, correos, IP ni respuestas del autodiagnóstico.`;
  const transporter=nodemailer.createTransport({host:SMTP_HOST,port:Number(SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||'false')==='true',auth:{user:SMTP_USER,pass:SMTP_PASS}});
  await transporter.sendMail({from:process.env.REPORT_FROM||SMTP_USER,to:REPORT_EMAIL,subject:`Reporte semanal de visitas — ${dates[0]} a ${dates[6]}`,text});
  console.log(`Reporte semanal enviado a ${REPORT_EMAIL}`);
}
function formatDuration(seconds){if(seconds<60)return`${Math.round(seconds)} s`;return`${Math.floor(seconds/60)} min ${Math.round(seconds%60)} s`;}
function scheduleWeekly(){const now=new Date();const next=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12,0,0));const daysUntil=(8-next.getUTCDay())%7||7;next.setUTCDate(next.getUTCDate()+daysUntil);const delay=next-now;console.log(`Reporte semanal programado para ${next.toISOString()} (si se configura SMTP).`);setTimeout(async()=>{try{await sendWeeklyReport();}catch(e){console.error('Error enviando informe semanal:',e.message);}setInterval(()=>sendWeeklyReport().catch(e=>console.error('Error enviando informe semanal:',e.message)),7*24*60*60*1000);},delay);}
function contentType(file){return MIME[path.extname(file).toLowerCase()]||'application/octet-stream';}
function serveStatic(req,res){let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return json(res,400,{error:'Ruta inválida'});}if(pathname.split('/').some(part=>part.startsWith('.')||part==='data'||part==='node_modules'))return json(res,404,{error:'No encontrado'});if(pathname==='/')pathname='/index.html';const target=path.resolve(ROOT,'.'+pathname);if(!target.startsWith(ROOT+path.sep)&&target!==ROOT)return json(res,403,{error:'Ruta no permitida'});fs.stat(target,(err,stat)=>{if(err||!stat.isFile())return json(res,404,{error:'No encontrado'});const cacheable=path.extname(target)!=='.html'&&!['analytics.js','analytics.css'].includes(path.basename(target));res.writeHead(200,{'Content-Type':contentType(target),'X-Content-Type-Options':'nosniff','Cache-Control':cacheable?'public, max-age=3600':'no-cache'});fs.createReadStream(target).pipe(res);});}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/analytics'){return json(res,200,analyticsPayload());}
  if(req.method==='GET'&&url.pathname==='/api/analytics/stream'){
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`data: ${JSON.stringify(analyticsPayload())}\n\n`);
    analyticsClients.add(res);
    req.on('close',()=>analyticsClients.delete(res));
    return;
  }
  if(req.method==='POST'&&url.pathname.startsWith('/api/')){
    if(!['/api/visit','/api/section-view','/api/section-time','/api/reaction'].includes(url.pathname))return json(res,404,{error:'Endpoint no encontrado'});
    if(!req.headers['content-type']?.includes('application/json'))return json(res,415,{error:'Se requiere JSON'});
    let body;try{body=await readBody(req);}catch{return json(res,400,{error:'Solicitud JSON inválida'});}
    if(!validSession(body.sessionId))return json(res,400,{error:'Sesión inválida'});
    const day=dayBucket();
    if(url.pathname==='/api/visit'){data.visits++;day.visits++;persist();return json(res,200,{ok:true});}
    if(url.pathname==='/api/reaction'){
      if(!['like','dislike'].includes(body.reaction))return json(res,400,{error:'Reacción inválida'});
      const field=body.reaction==='like'?'likes':'dislikes';data[field]++;day[field]++;persist();return json(res,200,{ok:true});
    }
    if(!validSection(body.section))return json(res,400,{error:'Apartado inválido'});
    if(url.pathname==='/api/section-view'){data.sections[body.section].views++;day.sections[body.section].views++;persist();return json(res,200,{ok:true});}
    if(url.pathname==='/api/section-time')return json(res,410,{error:'La métrica de permanencia ya no está disponible'});
  }
  if(req.method==='GET'||req.method==='HEAD')return serveStatic(req,res);
  json(res,405,{error:'Método no permitido'});
});
server.listen(PORT,HOST,()=>{console.log(`Página y analítica disponibles en http://localhost:${PORT}`);if(!process.env.REPORT_EMAIL||!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS)console.warn('Correo aún sin configurar: copia .env.example a .env y completa el destinatario y SMTP.');scheduleWeekly();});
