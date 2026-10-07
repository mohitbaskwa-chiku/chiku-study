const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

const seedExams = [
  ["SSC","SSC CGL Mock Test"],["SSC","SSC CHSL Mock Test"],["SSC","SSC MTS Mock Test"],["SSC","SSC GD Mock Test"],
  ["Railway","RRB NTPC Mock Test"],["Railway","RRB Group D Mock Test"],["Railway","RRB ALP Mock Test"],
  ["Banking","IBPS PO Mock Test"],["Banking","IBPS Clerk Mock Test"],["Banking","SBI PO Mock Test"],["Banking","SBI Clerk Mock Test"]
];
const seedQuestions = [
 ["What is the capital of India?",["Mumbai","New Delhi","Kolkata","Chennai"],1],
 ["Which planet is known as the Red Planet?",["Venus","Mars","Jupiter","Mercury"],1],
 ["What is 15 × 4?",["45","50","60","75"],2],
 ["Which gas is most abundant in Earth's atmosphere?",["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],1],
 ["Who wrote the Indian national anthem?",["Bankim Chandra","Rabindranath Tagore","Sarojini Naidu","S. C. Bose"],1],
 ["What is the SI unit of force?",["Joule","Watt","Newton","Pascal"],2],
 ["Which is the largest ocean?",["Atlantic","Indian","Pacific","Arctic"],2],
 ["1 kilometre equals how many metres?",["100","500","1000","1500"],2],
 ["Which is a prime number?",["21","27","29","33"],2],
 ["CPU stands for?",["Central Processing Unit","Computer Personal Unit","Central Program Utility","Control Processing User"],0]
];

function load(){
  if(!fs.existsSync(DATA_FILE)){
    const exams=seedExams.map((x,i)=>({id:i+1,category:x[0],name:x[1],duration_minutes:10}));
    const questions=seedQuestions.map((q,i)=>({id:i+1,exam_id:1,question:q[0],options:q[1],correct_option:q[2]}));
    const data={users:[],exams,questions,attempts:[]};
    fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));
    return data;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));
}
let db=load();
function save(){fs.writeFileSync(DATA_FILE,JSON.stringify(db,null,2))}
function hashPassword(p){return crypto.createHash("sha256").update(p).digest("hex")}
function requireLogin(req,res,next){if(!req.session.user)return res.status(401).json({error:"Login required"});next()}
function requireAdmin(req,res,next){if(!req.session.user||req.session.user.role!=="admin")return res.status(403).json({error:"Admin only"});next()}
function nextId(arr){return arr.length?Math.max(...arr.map(x=>x.id))+1:1}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"change-this-before-production",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",maxAge:604800000}}));
app.use(express.static(path.join(__dirname,"public")));
app.get("/google9b6f653f2e256e9c.html", (req, res) => {
  res.sendFile(path.join(__dirname, "google9b6f653f2e256e9c.html"));
});
app.post("/api/register",(req,res)=>{
 const name=(req.body.name||"").trim(),email=(req.body.email||"").trim().toLowerCase(),password=req.body.password||"";
 if(!name||!email||password.length<6)return res.status(400).json({error:"Name, email and 6+ character password required"});
 if(db.users.some(u=>u.email===email))return res.status(400).json({error:"Email already registered"});
 const u={id:nextId(db.users),name,email,password_hash:hashPassword(password),role:"student"};
 db.users.push(u);save();req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};res.json({user:req.session.user});
});
app.post("/api/login",(req,res)=>{
 const email=(req.body.email||"").trim().toLowerCase(),u=db.users.find(x=>x.email===email&&x.password_hash===hashPassword(req.body.password||""));
 if(!u)return res.status(401).json({error:"Invalid email or password"});
 req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};res.json({user:req.session.user});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/me",(req,res)=>res.json({user:req.session.user||null}));

app.get("/api/exams",(req,res)=>{
 res.json(db.exams.map(e=>({...e,question_count:db.questions.filter(q=>q.exam_id===e.id).length})));
});
app.get("/api/exams/:id",(req,res)=>{
 const e=db.exams.find(x=>x.id===Number(req.params.id));if(!e)return res.status(404).json({error:"Exam not found"});
 const questions=db.questions.filter(q=>q.exam_id===e.id).map(q=>({id:q.id,question:q.question,option_a:q.options[0],option_b:q.options[1],option_c:q.options[2],option_d:q.options[3]}));
 res.json({...e,questions});
});
app.post("/api/attempts",requireLogin,(req,res)=>{
 const examId=Number(req.body.examId),answers=req.body.answers||[],qs=db.questions.filter(q=>q.exam_id===examId);
 if(!qs.length)return res.status(400).json({error:"No questions"});
 let score=0,attempted=0;qs.forEach((q,i)=>{if(Number.isInteger(answers[i])){attempted++;if(answers[i]===q.correct_option)score++}});
 const a={id:nextId(db.attempts),user_id:req.session.user.id,exam_id:examId,score,total:qs.length,attempted,created_at:new Date().toISOString()};
 db.attempts.push(a);save();res.json({attemptId:a.id,score,total:qs.length,attempted,accuracy:attempted?Math.round(score/attempted*100):0});
});
app.get("/api/my-results",requireLogin,(req,res)=>{
 res.json(db.attempts.filter(a=>a.user_id===req.session.user.id).reverse().map(a=>{const e=db.exams.find(x=>x.id===a.exam_id);return {...a,category:e?.category,name:e?.name,accuracy:a.attempted?Math.round(a.score/a.attempted*100):0}}));
});
app.post("/api/admin/exams",requireAdmin,(req,res)=>{
 const e={id:nextId(db.exams),category:req.body.category,name:req.body.name,duration_minutes:Number(req.body.duration_minutes||10)};db.exams.push(e);save();res.json(e);
});
app.post("/api/admin/questions",requireAdmin,(req,res)=>{
 const e=db.exams.find(x=>x.id===Number(req.body.exam_id));const o=req.body.options;
 if(!e||!req.body.question||!Array.isArray(o)||o.length!==4)return res.status(400).json({error:"Invalid question"});
 const q={id:nextId(db.questions),exam_id:e.id,question:req.body.question,options:o,correct_option:Number(req.body.correct_option)};db.questions.push(q);save();res.json(q);
});

app.listen(PORT,()=>console.log(`Chiku Study running at http://localhost:${PORT}`));
