// IVF 간사 규정집 개정안 투표 서버 (외부 패키지 없이 Node.js만 사용)
// 환경변수: ADMIN_KEY(관리자 비밀번호, 필수), DATA_FILE(투표 저장 파일 경로), PORT
const http=require("http"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000,KEY=process.env.ADMIN_KEY||"";
const FILE=process.env.DATA_FILE||path.join(__dirname,"votes.json");
const OK=["찬성","반대","기권"];
const newEpoch=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let db={epoch:newEpoch(),votes:{}};   // epoch: 초기화할 때마다 바뀌는 투표 회차 번호
try{const d=JSON.parse(fs.readFileSync(FILE,"utf8"));if(d&&d.votes&&d.epoch)db=d;else if(d)db.votes=d}catch(e){}
const norm=s=>String(s||"").normalize("NFC").replace(/\s+/g,"").toLowerCase();
const save=()=>{fs.writeFileSync(FILE+".tmp",JSON.stringify(db));fs.renameSync(FILE+".tmp",FILE)};
const send=(res,c,o)=>{res.writeHead(c,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(o))};
const admin=u=>KEY&&u.searchParams.get("key")===KEY;
http.createServer((req,res)=>{
 const u=new URL(req.url,"http://x");
 if(u.pathname==="/api/epoch")return send(res,200,{epoch:db.epoch});
 if(req.method==="POST"&&u.pathname==="/api/vote"){
  let b="";req.on("data",d=>{b+=d;if(b.length>5000)req.destroy()});
  req.on("end",()=>{try{
   const v=JSON.parse(b),region=String(v.region||"").trim().slice(0,40),name=String(v.name||"").trim().slice(0,40);
   if(!region||!name||!OK.includes(v.a1)||!OK.includes(v.a2))return send(res,400,{});
   const k=norm(region)+"|"+norm(name);
   if(db.votes[k])return send(res,409,{});            // 중복투표 차단
   db.votes[k]={region,name,a1:v.a1,a2:v.a2,at:Date.now()};save();send(res,200,{ok:true,epoch:db.epoch});
  }catch(e){send(res,400,{})}});return}
 if(req.method==="POST"&&u.pathname==="/api/reset"){
  if(!admin(u))return send(res,403,{});               // 관리자만
  db.votes={};db.epoch=newEpoch();save();             // 투표와 중복투표 기록을 함께 초기화
  return send(res,200,{ok:true})}
 if(u.pathname==="/api/results"){
  if(!admin(u))return send(res,403,{});               // 관리자만
  return send(res,200,Object.values(db.votes))}
 const page=u.pathname==="/admin"?"admin.html":"index.html";     // 관리자 페이지는 /admin 에서만 열림(비밀번호 필요)
 res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
 res.end(fs.readFileSync(path.join(__dirname,page)));
}).listen(PORT,()=>console.log("listening "+PORT));
