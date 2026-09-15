require("dotenv").config();
const express=require("express"),cors=require("cors"),fs=require("fs"),path=require("path"),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken");
const app=express(),PORT=3000,FILE=path.join(__dirname,"data","bookings.json");
app.use(cors());
app.use(express.json());
app.post("/api/admin/login", async (req,res)=>{
  const {username,password}=req.body;

  if(
    username!==process.env.ADMIN_USERNAME ||
    password!==process.env.ADMIN_PASSWORD
  ){
    return res.status(401).json({
      success:false,
      message:"Invalid username or password"
    });
  }

  const token=jwt.sign(
    {username},
    process.env.JWT_SECRET,
    {expiresIn:"8h"}
  );

  res.json({
    success:true,
    token
  });
});
app.use(express.static(path.join(__dirname,"public")));

const read=()=>{try{return JSON.parse(fs.readFileSync(FILE,"utf8"))}catch{return[]}};
const save=x=>fs.writeFileSync(FILE,JSON.stringify(x,null,2));
app.get("/api/health",(q,s)=>s.json({ok:true}));
app.post("/api/bookings",(q,s)=>{
 const b=q.body;
 if(!b.name||!b.phone||!b.service||!b.date||!b.time)return s.status(400).json({message:"Name, phone, service, date and time are required."});
 const x={id:"NIR-"+Date.now().toString().slice(-8),...b,status:"Pending",createdAt:new Date().toISOString()};
 const all=read();all.unshift(x);save(all);s.status(201).json({message:"Booking received",booking:x});
});
const adminAuth=(req,res,next)=>{
  const auth=req.headers.authorization;

  if(!auth || !auth.startsWith("Bearer ")){
    return res.status(401).json({
      message:"Admin authentication required"
    });
  }

  const token=auth.split(" ")[1];

  try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    req.admin=decoded;
    next();
  }catch(err){
    return res.status(401).json({
      message:"Invalid or expired admin session"
    });
  }
};
app.get("/api/bookings",adminAuth,(q,s)=>s.json(read()));
app.patch("/api/bookings/:id",adminAuth,(q,s)=>{
 const allowed=["Pending","Confirmed","Completed","Cancelled"],all=read(),x=all.find(b=>b.id===q.params.id);
 if(!x)return s.status(404).json({message:"Booking not found"});
 if(!allowed.includes(q.body.status))return s.status(400).json({message:"Invalid status"});
 x.status=q.body.status;save(all);s.json(x);
});
app.listen(PORT,()=>console.log("NIRAMAY server: http://localhost:"+PORT));
