import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

let pool;
const db=()=>{if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured'); if(!pool) pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:undefined,max:5}); return pool};
const send=(res,status,data)=>res.status(status).json(data);
const clean=(v,max=5000)=>typeof v==='string'?v.trim().slice(0,max):'';
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const auth=req=>{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return null;try{return jwt.verify(h.slice(7),process.env.JWT_SECRET)}catch{return null}};
const token=u=>jwt.sign({sub:u.id,role:u.role,email:u.email,name:u.name},process.env.JWT_SECRET,{expiresIn:'7d'});
const parse=req=>{try{return typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{})}catch(e){throw Object.assign(new Error('Invalid JSON body.'),{statusCode:400})}};
const currencies=['USD','EUR','GBP','NGN'];
const propertyStatuses=['available','reserved','sold'];

export default async function handler(req,res){
  try{
    const rawPath=Array.isArray(req.query.path)?req.query.path.join('/'):String(req.query.path||'');
    const path=rawPath.replace(/^\/?api\/?/,'').replace(/^\/+|\/+$/g,'');
    const method=req.method;
    const b=parse(req);

    if(method==='GET'&&path==='health')return send(res,200,{ok:true,service:'aurelia-api'});

    if(method==='POST'&&path==='auth/register'){
      const name=clean(b.name,120),email=clean(b.email,254).toLowerCase(),password=typeof b.password==='string'?b.password:'';
      if(name.length<2||!emailOk(email)||password.length<8)return send(res,400,{error:'Enter a valid name, email and an 8-character password.'});
      if((await db().query('SELECT id FROM users WHERE email=$1',[email])).rowCount)return send(res,409,{error:'An account with this email already exists.'});
      const hash=await bcrypt.hash(password,12);
      const r=await db().query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,created_at',[name,email,hash,'client']);
      return send(res,201,{user:r.rows[0],token:token(r.rows[0])});
    }

    if(method==='POST'&&path==='auth/login'){
      const email=clean(b.email,254).toLowerCase(),password=typeof b.password==='string'?b.password:'';
      const r=await db().query('SELECT id,name,email,password_hash,role,created_at FROM users WHERE email=$1',[email]);
      if(!r.rowCount||!(await bcrypt.compare(password,r.rows[0].password_hash)))return send(res,401,{error:'Invalid email or password.'});
      const u=r.rows[0];return send(res,200,{user:{id:u.id,name:u.name,email:u.email,role:u.role,created_at:u.created_at},token:token(u)});
    }

    if(method==='GET'&&path==='properties'){
      const r=await db().query('SELECT id,title,location,type,price,currency,image_url,description,status FROM properties WHERE status=$1 ORDER BY created_at DESC',['available']);
      return send(res,200,{properties:r.rows});
    }

    if(method==='POST'&&path==='enquiries'){
      const name=clean(b.name,120),email=clean(b.email,254).toLowerCase(),message=clean(b.message,5000),phone=clean(b.phone,40);
      if(name.length<2||!emailOk(email)||!message)return send(res,400,{error:'Enter a valid name, email and message.'});
      const u=auth(req);
      await db().query('INSERT INTO enquiries(user_id,name,email,phone,message,status) VALUES($1,$2,$3,$4,$5,$6)',[u?.sub||null,name,email,phone||null,message,'new']);
      return send(res,201,{message:'Your enquiry has been received.'});
    }

    const u=auth(req);
    if(!u)return send(res,401,{error:'Authentication required.'});

    if(method==='GET'&&path==='me'){
      const r=await db().query('SELECT id,name,email,role,created_at FROM users WHERE id=$1',[u.sub]);
      if(!r.rowCount)return send(res,401,{error:'Account not found.'});
      return send(res,200,{user:r.rows[0]});
    }

    if(method==='GET'&&path==='portal'){
      const [i,d,e]=await Promise.all([
        db().query('SELECT id,name,value,return_percent,status FROM investments WHERE user_id=$1 ORDER BY created_at DESC',[u.sub]),
        db().query('SELECT id,name,file_url,created_at FROM documents WHERE user_id=$1 ORDER BY created_at DESC',[u.sub]),
        db().query('SELECT id,message,status,created_at FROM enquiries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10',[u.sub])
      ]);
      return send(res,200,{portfolioValue:i.rows.reduce((n,x)=>n+Number(x.value),0),investments:i.rows,documents:d.rows,enquiries:e.rows});
    }

    if(method==='POST'&&path==='payments/initialize'){
      if(!process.env.PAYSTACK_SECRET_KEY)return send(res,503,{error:'Payment service is not configured.'});
      const amount=Number(b.amount),currency=b.currency||'NGN';
      if(!Number.isFinite(amount)||amount<=0||!['NGN','GHS','ZAR','KES','USD'].includes(currency))return send(res,400,{error:'Enter a valid payment amount and currency.'});
      const customer=(await db().query('SELECT email FROM users WHERE id=$1',[u.sub])).rows[0];
      if(!customer)return send(res,401,{error:'Account not found.'});
      const reference='ABG-'+crypto.randomUUID();
      await db().query('INSERT INTO payments(user_id,reference,provider,amount,currency,status,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)',[u.sub,reference,'paystack',amount,currency,'pending',JSON.stringify(b.metadata||{})]);
      const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:customer.email,amount:String(Math.round(amount*100)),currency,reference,callback_url:(process.env.APP_URL||'')+'/#portal'})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||!j.status)return send(res,502,{error:'Unable to initialize payment.'});
      return send(res,200,{authorization_url:j.data.authorization_url,reference});
    }

    if(method==='GET'&&path.startsWith('payments/verify/')){
      if(!process.env.PAYSTACK_SECRET_KEY)return send(res,503,{error:'Payment service is not configured.'});
      const reference=path.slice('payments/verify/'.length);
      const p=await db().query('SELECT * FROM payments WHERE reference=$1 AND user_id=$2',[reference,u.sub]);
      if(!p.rowCount)return send(res,404,{error:'Payment not found.'});
      const r=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.status)return send(res,502,{error:'Unable to verify payment.'});
      const tx=j.data;if(Number(tx.amount)!==Math.round(Number(p.rows[0].amount)*100)||tx.currency!==p.rows[0].currency)return send(res,400,{error:'Payment verification mismatch.'});
      const status=tx.status==='success'?'success':p.rows[0].status;
      await db().query('UPDATE payments SET status=$1,provider_transaction_id=$2,updated_at=now() WHERE reference=$3',[status,tx.id,reference]);
      return send(res,200,{status,reference});
    }

    if(method==='POST'&&path==='payments/webhook'){
      if(!process.env.PAYSTACK_SECRET_KEY)return send(res,503,{error:'Payment service is not configured.'});
      const sig=String(req.headers['x-paystack-signature']||''),expected=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(JSON.stringify(b)).digest('hex');
      if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return send(res,401,{error:'Invalid webhook signature.'});
      if(b.event==='charge.success'&&b.data?.reference){
        const p=await db().query('SELECT * FROM payments WHERE reference=$1',[b.data.reference]);
        if(p.rowCount&&Number(b.data.amount)===Math.round(Number(p.rows[0].amount)*100)&&b.data.currency===p.rows[0].currency)await db().query("UPDATE payments SET status='success',provider_transaction_id=$1,updated_at=now() WHERE reference=$2",[b.data.id,b.data.reference]);
      }
      return send(res,200,{received:true});
    }

    if(path.startsWith('admin/')){
      if(u.role!=='admin')return send(res,403,{error:'Administrator access required.'});

      if(method==='GET'&&path==='admin/overview'){
        const [c,p,i,l,e]=await Promise.all([
          db().query("SELECT COUNT(*)::int count FROM users WHERE role='client'"),
          db().query('SELECT COUNT(*)::int count FROM properties'),
          db().query('SELECT COALESCE(SUM(value),0) total FROM investments'),
          db().query("SELECT COUNT(*)::int count FROM enquiries WHERE status<>'closed'"),
          db().query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 10')
        ]);
        return send(res,200,{metrics:{clients:c.rows[0].count,properties:p.rows[0].count,investments:i.rows[0].total,leads:l.rows[0].count},enquiries:e.rows});
      }

      if(method==='GET'&&path==='admin/users'){
        const r=await db().query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC');return send(res,200,{users:r.rows});
      }

      if(method==='GET'&&path==='admin/properties'){
        const r=await db().query('SELECT * FROM properties ORDER BY created_at DESC');return send(res,200,{properties:r.rows});
      }

      if(method==='POST'&&path==='admin/properties'){
        const title=clean(b.title,160),location=clean(b.location,160),type=clean(b.type,100),price=Number(b.price),currency=b.currency||'USD',status=b.status||'available';
        if(!title||!location||!type||!Number.isFinite(price)||price<0||!currencies.includes(currency)||!propertyStatuses.includes(status))return send(res,400,{error:'Valid property details are required.'});
        const r=await db().query('INSERT INTO properties(title,location,type,price,currency,image_url,description,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[title,location,type,price,currency,clean(b.image_url,1000)||null,clean(b.description),status]);
        return send(res,201,{property:r.rows[0]});
      }

      if(path.startsWith('admin/properties/')){
        const id=path.split('/').pop();if(!uuid(id))return send(res,400,{error:'Invalid property id.'});
        if(method==='DELETE'){const r=await db().query('DELETE FROM properties WHERE id=$1 RETURNING id',[id]);return r.rowCount?send(res,200,{message:'Property deleted.'}):send(res,404,{error:'Property not found.'})}
        if(method==='PATCH'){
          const allowed=['title','location','type','price','currency','image_url','description','status'],entries=Object.entries(b).filter(([k])=>allowed.includes(k));
          if(!entries.length)return send(res,400,{error:'No fields to update.'});
          if(entries.some(([k,v])=>(k==='price'&&(!Number.isFinite(Number(v))||Number(v)<0))||(k==='currency'&&!currencies.includes(v))||(k==='status'&&!propertyStatuses.includes(v))))return send(res,400,{error:'Invalid property field value.'});
          const vals=entries.map(([k,v])=>k==='price'?Number(v):typeof v==='string'?clean(v):v);vals.push(id);
          const set=entries.map(([k],i)=>k+'=$'+(i+1)).join(',');
          const r=await db().query('UPDATE properties SET '+set+' WHERE id=$'+vals.length+' RETURNING *',vals);return r.rowCount?send(res,200,{property:r.rows[0]}):send(res,404,{error:'Property not found.'});
        }
      }

      if(method==='GET'&&path==='admin/investments'){
        const r=await db().query('SELECT i.*,u.name user_name,u.email user_email FROM investments i JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC');return send(res,200,{investments:r.rows});
      }
      if(method==='POST'&&path==='admin/investments'){
        if(!uuid(b.user_id)||!b.name||!Number.isFinite(Number(b.value)))return send(res,400,{error:'Valid user, name and value are required.'});
        const r=await db().query('INSERT INTO investments(user_id,name,value,return_percent,status) VALUES($1,$2,$3,$4,$5) RETURNING *',[b.user_id,clean(b.name,200),Number(b.value),Number(b.return_percent)||0,clean(b.status||'active',50)]);return send(res,201,{investment:r.rows[0]});
      }
      if(method==='DELETE'&&path.startsWith('admin/investments/')){
        const id=path.split('/').pop();if(!uuid(id))return send(res,400,{error:'Invalid investment id.'});const r=await db().query('DELETE FROM investments WHERE id=$1 RETURNING id',[id]);return r.rowCount?send(res,200,{message:'Investment deleted.'}):send(res,404,{error:'Investment not found.'});
      }
      if(method==='GET'&&path==='admin/documents'){
        const r=await db().query('SELECT d.*,u.name user_name,u.email user_email FROM documents d JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC');return send(res,200,{documents:r.rows});
      }
      if(method==='POST'&&path==='admin/documents'){
        if(!uuid(b.user_id)||!b.name||!b.file_url)return send(res,400,{error:'User, document name and file URL are required.'});
        const r=await db().query('INSERT INTO documents(user_id,name,file_url) VALUES($1,$2,$3) RETURNING *',[b.user_id,clean(b.name,200),clean(b.file_url,2000)]);return send(res,201,{document:r.rows[0]});
      }
      if(method==='GET'&&path==='admin/enquiries'){
        const r=await db().query('SELECT * FROM enquiries ORDER BY created_at DESC');return send(res,200,{enquiries:r.rows});
      }
      if(method==='PATCH'&&path.startsWith('admin/enquiries/')){
        const id=path.split('/').pop();if(!uuid(id))return send(res,400,{error:'Invalid enquiry id.'});const status=clean(b.status,50);if(!['new','qualified','proposal','closed'].includes(status))return send(res,400,{error:'Invalid enquiry status.'});
        const r=await db().query('UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING *',[status,id]);return r.rowCount?send(res,200,{enquiry:r.rows[0]}):send(res,404,{error:'Enquiry not found.'});
      }
      return send(res,404,{error:'Admin route not found.'});
    }

    return send(res,404,{error:'Route not found.'});
  }catch(err){
    console.error(err);
    return send(res,err.statusCode||500,{error:err.statusCode?err.message:'Internal server error.'});
  }
}