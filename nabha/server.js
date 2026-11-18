// Digital Learning Platform - Nabha | Developed by Piyush and Team
const express=require('express'),fs=require('fs'),crypto=require('crypto'),path=require('path');
const F=path.join(__dirname,'data.json'),SEC=process.env.SECRET||'nabha-secret',DEMO=process.env.DEMO_MODE!=='false';
const H=p=>crypto.scryptSync(p,'nabha-salt',32).toString('hex');
const T=(en,hi,pa)=>({en,hi,pa});
let db;
function seed(){
 const U=(id,username,name,role,cls,pw,ap=true)=>({id,username,name,role,class:cls,hash:H(pw),approved:ap});
 db={users:[U(1,'admin','Harpreet Singh','admin',0,'admin123'),U(2,'teacher_manpreet','Manpreet Kaur','teacher',0,'teacher123'),U(3,'teacher_gurdeep','Gurdeep Singh','teacher',0,'teacher123'),U(4,'simran_k','Simranjit Kaur','student',8,'student123'),U(5,'new_student','New Student','student',8,'student123')],
 lessons:[[1,'Maths',6,'Fractions','भिन्न','ਭਿੰਨ'],[2,'Maths',8,'Algebra Basics','बीजगणित की मूल बातें','ਬੀਜਗਣਿਤ ਦੀਆਂ ਬੁਨਿਆਦਾਂ'],[3,'Science',7,'Photosynthesis','प्रकाश संश्लेषण','ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ'],[4,'Science',8,'States of Matter','पदार्थ की अवस्थाएँ','ਪਦਾਰਥ ਦੀਆਂ ਅਵਸਥਾਵਾਂ'],[5,'English',8,'Nouns and Verbs','संज्ञा और क्रिया','ਨਾਂਵ ਅਤੇ ਕਿਰਿਆ'],[6,'Punjabi',8,'Punjabi Alphabet','पंजाबी वर्णमाला','ਪੰਜਾਬੀ ਵਰਣਮਾਲਾ']].map(([id,s,c,a,b,d])=>({id,s,c,t:T(a,b,d),n:{en:'Read this chapter carefully, then mark it complete and take the quiz.'}})),
 quizzes:[{id:1,lesson:1,q:[{q:T('What is 1/2 + 1/2?','1/2 + 1/2 कितना होता है?','1/2 + 1/2 ਕਿੰਨਾ ਹੁੰਦਾ ਹੈ?'),o:['1','2','1/4'],a:0},{q:T('Which is bigger, 1/2 or 1/4?','कौन बड़ा है, 1/2 या 1/4?','ਕਿਹੜਾ ਵੱਡਾ ਹੈ, 1/2 ਜਾਂ 1/4?'),o:['1/2','1/4'],a:0}]},
 {id:2,lesson:3,q:[{q:T('Plants make food using…','पौधे भोजन बनाने के लिए क्या उपयोग करते हैं?','ਪੌਦੇ ਭੋਜਨ ਬਣਾਉਣ ਲਈ ਕੀ ਵਰਤਦੇ ਹਨ?'),o:[T('Sunlight','सूर्य का प्रकाश','ਸੂਰਜ ਦੀ ਰੌਸ਼ਨੀ'),T('Sand','रेत','ਰੇਤ')],a:0},{q:T('What do plants release?','पौधे क्या छोड़ते हैं?','ਪੌਦੇ ਕੀ ਛੱਡਦੇ ਹਨ?'),o:[T('Oxygen','ऑक्सीजन','ਆਕਸੀਜਨ'),T('Smoke','धुआँ','ਧੂੰਆਂ')],a:0}]}],
 prog:{4:{l:[1,2],q:{1:100}}},ann:[{text:'Welcome to the Nabha Digital Learning Platform!',by:'Manpreet Kaur'}]};save();}
const save=()=>fs.writeFileSync(F,JSON.stringify(db));
db=fs.existsSync(F)?JSON.parse(fs.readFileSync(F)):(seed(),db);
const sign=o=>{const b=Buffer.from(JSON.stringify({...o,e:Date.now()+864e5})).toString('base64url');return b+'.'+crypto.createHmac('sha256',SEC).update(b).digest('base64url')};
const ver=t=>{try{const[b,s]=t.split('.');if(s!==crypto.createHmac('sha256',SEC).update(b).digest('base64url'))return;const o=JSON.parse(Buffer.from(b,'base64url'));return o.e>Date.now()?o:null}catch{}};
const auth=(...r)=>(q,s,n)=>{const o=ver((q.headers.authorization||'').slice(7));if(!o||(r.length&&!r.includes(o.role)))return s.status(401).json({error:'wrong'});q.u=db.users.find(u=>u.id===o.id);if(!q.u)return s.status(401).json({error:'wrong'});n()};
const P=id=>db.prog[id]||(db.prog[id]={l:[],q:{}});
const pc=id=>{const p=P(id),n=db.lessons.length+db.quizzes.length;return n?Math.round((p.l.length+Object.keys(p.q).length)/n*100):0};
const pub=u=>({id:u.id,username:u.username,name:u.name,role:u.role,class:u.class,approved:u.approved});
const app=express();app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
app.get('/api/config',(q,s)=>s.json({demo:DEMO}));
app.post('/api/login',(q,s)=>{const{username,password,role}=q.body,u=db.users.find(x=>x.username===username);
 if(!u||u.hash!==H(password||'')||u.role!==role)return s.status(400).json({error:'wrong'});
 if(!u.approved)return s.status(403).json({error:'pending'});s.json({token:sign({id:u.id,role:u.role}),user:pub(u)})});
app.post('/api/register',(q,s)=>{const{username,password,name,role}=q.body;
 if(!['student','teacher'].includes(role)||!username||!password||!name)return s.status(400).json({error:'wrong'});
 if(db.users.some(x=>x.username===username))return s.status(400).json({error:'taken'});
 const u={id:Date.now(),username,name,role,class:role==='student'?+q.body.class||6:0,hash:H(password),approved:role==='student'};db.users.push(u);save();
 u.approved?s.json({token:sign({id:u.id,role}),user:pub(u)}):s.json({pending:true})});
app.get('/api/content',auth(),(q,s)=>s.json({lessons:db.lessons,quizzes:db.quizzes}));
app.get('/api/announcements',auth(),(q,s)=>s.json(db.ann.slice(-5).reverse()));
app.get('/api/progress',auth('student'),(q,s)=>s.json(P(q.u.id)));
app.post('/api/sync',auth('student'),(q,s)=>{const p=P(q.u.id);(q.body.ops||[]).forEach(o=>{if(o.t==='l'&&db.lessons.some(l=>l.id===o.id)&&!p.l.includes(o.id))p.l.push(o.id);if(o.t==='q'&&db.quizzes.some(z=>z.id===o.id))p.q[o.id]=Math.max(0,Math.min(100,+o.score||0))});save();s.json({ok:true,pct:pc(q.u.id)})});
app.get('/api/teacher/students',auth('teacher','admin'),(q,s)=>s.json(db.users.filter(u=>u.role==='student').map(u=>({...pub(u),p:pc(u.id)}))));
app.post('/api/teacher/lesson',auth('teacher','admin'),(q,s)=>{const{en,hi,pa,subject,cls}=q.body;if(!en)return s.status(400).json({error:'wrong'});db.lessons.push({id:Date.now(),s:subject,c:+cls||8,t:T(en,hi||en,pa||en),n:{en:'Read this chapter carefully, then mark it complete.'}});save();s.json({ok:true})});
app.post('/api/announce',auth('teacher','admin'),(q,s)=>{if(q.body.text){db.ann.push({text:String(q.body.text).slice(0,300),by:q.u.name});save()}s.json({ok:true})});
app.get('/api/admin/users',auth('admin'),(q,s)=>s.json(db.users.map(pub)));
app.post('/api/admin/approve',auth('admin'),(q,s)=>{const u=db.users.find(x=>x.id===q.body.id);if(u)u.approved=true;save();s.json({ok:true})});
app.post('/api/admin/reset',auth('admin'),(q,s)=>{const u=db.users.find(x=>x.id===q.body.id);if(u&&q.body.password)u.hash=H(q.body.password);save();s.json({ok:true})});
const port=process.env.PORT||5000;app.listen(port,()=>console.log('Nabha Learning Platform running at http://localhost:'+port));
