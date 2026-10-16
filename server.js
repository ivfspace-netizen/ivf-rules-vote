// IVF 간사 규정집 개정안 투표 서버 (외부 패키지 없이 Node.js만 사용)
// 환경변수: ADMIN_KEY(관리자 비밀번호, 필수), DATA_FILE(투표 저장 파일 경로), PORT
const http=require("http"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000,KEY=process.env.ADMIN_KEY||"";
const FILE=process.env.DATA_FILE||path.join(__dirname,"votes.json");
const OK=["찬성","반대","기권"];
let votes={};try{votes=JSON.parse(fs.readFileSync(FILE,"utf8"))}catch(e){}
const norm=s=>String(s||"").normalize("NFC").replace(/\s+/g,"").toLowerCase();
const save=()=>{fs.writeFileSync(FILE+".tmp",JSON.stringify(votes));fs.renameSync(FILE+".tmp",FILE)};
const send=(res,c,o)=>{res.writeHead(c,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{
 const u=new URL(req.url,"http://x");
 if(req.method==="POST"&&u.pathname==="/api/vote"){
  let b="";req.on("data",d=>{b+=d;if(b.length>5000)req.destroy()});
  req.on("end",()=>{try{
   const v=JSON.parse(b),region=String(v.region||"").trim().slice(0,40),name=String(v.name||"").trim().slice(0,40);
   if(!region||!name||!OK.includes(v.a1)||!OK.includes(v.a2))return send(res,400,{});
   const k=norm(region)+"|"+norm(name);
   if(votes[k])return send(res,409,{});            // 중복투표 차단
   votes[k]={region,name,a1:v.a1,a2:v.a2,at:Date.now()};save();send(res,200,{ok:true});
  }catch(e){send(res,400,{})}});return}
 if(req.method==="POST"&&u.pathname==="/api/reset"){
  if(!KEY||u.searchParams.get("key")!==KEY)return send(res,403,{});   // 관리자만
  votes={};save();return send(res,200,{ok:true})}
 if(u.pathname==="/api/results"){
  if(!KEY||u.searchParams.get("key")!==KEY)return send(res,403,{});   // 관리자만
  return send(res,200,Object.values(votes))}
 res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
 res.end(fs.readFileSync(path.join(__dirname,"index.html")));
}).listen(PORT,()=>console.log("listening "+PORT));
