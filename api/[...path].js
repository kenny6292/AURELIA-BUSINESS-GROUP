import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

let pool;
function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, max: 5 });
  return pool;
}
function token(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
function auth(req) {
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return null;
  try { return jwt.verify(value.slice(7), process.env.JWT_SECRET); } catch { return null; }
}
function send(res, status, data) { res.status(status).json(data); }
function body(req) { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { throw Object.assign(new Error('Invalid JSON body.'), { statusCode: 400 }); } }\nfunction cleanText(value, max=5000) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }\nfunction validEmail(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }\nfunction validUUID(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }\nconst currencies=['USD','EUR','GBP','NGN'];\nconst propertyStatuses=['available','reserved','sold'];

export default async function handler(req, res) {
  try {
    const path = (req.query.path || []).join('/');
    const method = req.method;
    const b = body(req);

    if (method === 'GET' && path === 'health') return send(res, 200, { ok: true, service: 'aurelia-api' });

    if (method === 'POST' && path === 'auth/register') {
      const { name, email, password } = b;
      if (!name || !email || !password || password.length < 8 || cleanText(name,120).length < 2 || !validEmail(email)) return send(res, 400, { error: 'Enter a valid name, email and an 8-character password.' });
      const existing = await db().query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
      if (existing.rowCount) return send(res, 409, { error: 'An account with this email already exists.' });
      const hash = await bcrypt.hash(password, 12);
      const result = await db().query('INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,created_at', [name.trim(), email.toLowerCase(), hash, 'client']);
      return send(res, 201, { user: result.rows[0], token: token(result.rows[0]) });
    }

    if (method === 'POST' && path === 'auth/login') {
      const { email, password } = b;
      const result = await db().query('SELECT id,name,email,password_hash,role,created_at FROM users WHERE email=$1', [(email || '').toLowerCase()]);
      if (!result.rowCount || !(await bcrypt.compare(password || '', result.rows[0].password_hash))) return send(res, 401, { error: 'Invalid email or password.' });
      const u = result.rows[0];
      return send(res, 200, { user: { id:u.id,name:u.name,email:u.email,role:u.role,created_at:u.created_at }, token: token(u) });
    }

    if (method === 'GET' && path === 'me') {
      const u = auth(req);
      if (!u) return send(res, 401, { error: 'Authentication required.' });
      const result = await db().query('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [u.sub]);
      if (!result.rowCount) return send(res, 401, { error: 'Account not found.' });
      return send(res, 200, { user: result.rows[0] });
    }

    if (method === 'POST' && path === 'enquiries') {
      const { name, email, message, phone } = b;
      if (!name || !email || !message || !validEmail(email)) return send(res, 400, { error: 'Enter a valid name, email and message.' });
      const u = auth(req);
      await db().query('INSERT INTO enquiries (user_id,name,email,phone,message,status) VALUES ($1,$2,$3,$4,$5,$6)', [u?.sub || null, cleanText(name,120), email.toLowerCase(), cleanText(phone,40) || null, cleanText(message,5000), 'new']);
      return send(res, 201, { message: 'Your enquiry has been received.' });
    }

    if (method === 'GET' && path === 'properties') {
      const result = await db().query('SELECT id,title,location,type,price,currency,image_url,description,status FROM properties WHERE status=$1 ORDER BY created_at DESC', ['available']);
      return send(res, 200, { properties: result.rows });
    }

    const u = auth(req);
    if (!u) return send(res, 401, { error: 'Authentication required.' });


    if (method === 'POST' && path === 'payments/initialize') {
      if (!process.env.PAYSTACK_SECRET_KEY) return send(res, 503, { error: 'Payment service is not configured.' });
      const { amount, currency='NGN', metadata={} } = b;
      const cleanAmount = Number(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0 || !['NGN','GHS','ZAR','KES','USD'].includes(currency)) return send(res,400,{error:'Enter a valid payment amount and currency.'});
      const userResult = await db().query('SELECT id,name,email FROM users WHERE id=$1',[u.sub]);
      if (!userResult.rowCount) return send(res,401,{error:'Account not found.'});
      const customer=userResult.rows[0];
      const reference='ABG-'+crypto.randomUUID();
      await db().query('INSERT INTO payments (user_id,reference,provider,amount,currency,status,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7)',[u.sub,reference,'paystack',cleanAmount,currency,'pending',JSON.stringify(cleanText(JSON.stringify(metadata),2000))]);
      const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:customer.email,amount:String(Math.round(cleanAmount*100)),currency,reference,callback_url:(process.env.APP_URL||'').replace(/\/$/,'')+'/#portal',metadata:{user_id:u.sub,reference}})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.status) return send(res,502,{error:'Unable to initialize payment.'});
      return send(res,200,{authorization_url:result.data.authorization_url,access_code:result.data.access_code,reference});
    }

    if (method === 'GET' && path.startsWith('payments/verify/')) {
      if (!process.env.PAYSTACK_SECRET_KEY) return send(res,503,{error:'Payment service is not configured.'});
      const reference=path.split('/').pop();
      if(!reference || !/^[A-Za-z0-9.=_-]{3,100}$/.test(reference)) return send(res,400,{error:'Invalid payment reference.'});
      const payment=await db().query('SELECT * FROM payments WHERE reference=$1 AND user_id=$2',[reference,u.sub]);
      if(!payment.rowCount) return send(res,404,{error:'Payment not found.'});
      const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok || !result.status) return send(res,502,{error:'Unable to verify payment.'});
      const tx=result.data;
      const expected=Math.round(Number(payment.rows[0].amount)*100);
      if(Number(tx.amount)!==expected || tx.currency!==payment.rows[0].currency) return send(res,400,{error:'Payment verification mismatch.'});
      const status=tx.status==='success'?'success':payment.rows[0].status;
      await db().query('UPDATE payments SET status=$1,provider_transaction_id=$2,updated_at=now() WHERE reference=$3',[status,tx.id,reference]);
      return send(res,200,{status,reference});
    }

    if (method === 'POST' && path === 'payments/webhook') {
      if (!process.env.PAYSTACK_SECRET_KEY) return send(res,503,{error:'Payment service is not configured.'});
      const signature=req.headers['x-paystack-signature'];
      const payload=JSON.stringify(b);
      const expected=crypto.createHmac('sha512',process.env.PAYSTACK_SECRET_KEY).update(payload).digest('hex');
      if(!signature || !crypto.timingSafeEqual(Buffer.from(String(signature)),Buffer.from(expected))) return send(res,401,{error:'Invalid webhook signature.'});
      if(b.event==='charge.success' && b.data?.reference){
        const p=await db().query('SELECT * FROM payments WHERE reference=$1',[b.data.reference]);
        if(p.rowCount && Number(b.data.amount)===Math.round(Number(p.rows[0].amount)*100) && b.data.currency===p.rows[0].currency){
          await db().query('UPDATE payments SET status=$1,provider_transaction_id=$2,updated_at=now() WHERE reference=$3 AND status<>$1',['success',b.data.id,b.data.reference]);
        }
      }
      return send(res,200,{received:true});
    }

    if (method === 'GET' && path === 'portal') {
      const [investments, documents, enquiries] = await Promise.all([
        db().query('SELECT id,name,value,return_percent,status FROM investments WHERE user_id=$1 ORDER BY created_at DESC', [u.sub]),
        db().query('SELECT id,name,file_url,created_at FROM documents WHERE user_id=$1 ORDER BY created_at DESC', [u.sub]),
        db().query('SELECT id,message,status,created_at FROM enquiries WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10', [u.sub])
      ]);
      const total = investments.rows.reduce((sum, x) => sum + Number(x.value), 0);
      return send(res, 200, { portfolioValue: total, investments: investments.rows, documents: documents.rows, enquiries: enquiries.rows });
    }

    if (path.startsWith('admin/')) {
      if (u.role !== 'admin') return send(res, 403, { error: 'Administrator access required.' });


      if (method === 'GET' && path === 'admin/investments') {
        const result=await db().query('SELECT i.*,u.name AS user_name,u.email AS user_email FROM investments i JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC');
        return send(res,200,{investments:result.rows});
      }
      if (method === 'POST' && path === 'admin/investments') {
        const {user_id,name,value,return_percent=0,status='active'}=b;
        if(!validUUID(user_id)||!name||!Number.isFinite(Number(value))||Number(value)<0) return send(res,400,{error:'Valid user, name and value are required.'});
        const result=await db().query('INSERT INTO investments (user_id,name,value,return_percent,status) VALUES ($1,$2,$3,$4,$5) RETURNING *',[user_id,cleanText(name,200),Number(value),Number(return_percent)||0,cleanText(status,50)]);
        return send(res,201,{investment:result.rows[0]});
      }
      if (method === 'DELETE' && path.startsWith('admin/investments/')) {
        const id=path.split('/').pop(); if(!validUUID(id)) return send(res,400,{error:'Invalid investment id.'});
        const result=await db().query('DELETE FROM investments WHERE id=$1 RETURNING id',[id]);
        if(!result.rowCount) return send(res,404,{error:'Investment not found.'});
        return send(res,200,{message:'Investment deleted.'});
      }
      if (method === 'GET' && path === 'admin/documents') {
        const result=await db().query('SELECT d.*,u.name AS user_name,u.email AS user_email FROM documents d JOIN users u ON u.id=d.user_id ORDER BY d.created_at DESC');
        return send(res,200,{documents:result.rows});
      }
      if (method === 'POST' && path === 'admin/documents') {
        const {user_id,name,file_url}=b;
        if(!validUUID(user_id)||!name||!file_url) return send(res,400,{error:'User, document name and file URL are required.'});
        const result=await db().query('INSERT INTO documents (user_id,name,file_url) VALUES ($1,$2,$3) RETURNING *',[user_id,cleanText(name,200),cleanText(file_url,2000)]);
        return send(res,201,{document:result.rows[0]});
      }

      if (method === 'GET' && path === 'admin/overview') {
        const [clients, properties, investments, leads] = await Promise.all([
          db().query("SELECT COUNT(*)::int AS count FROM users WHERE role='client'"),
          db().query('SELECT COUNT(*)::int AS count FROM properties'),
          db().query('SELECT COALESCE(SUM(value),0)::numeric AS total FROM investments'),
          db().query("SELECT COUNT(*)::int AS count FROM enquiries WHERE status IN ('new','qualified','proposal')")
        ]);
        const recent = await db().query('SELECT id,name,email,phone,message,status,created_at FROM enquiries ORDER BY created_at DESC LIMIT 20');
        return send(res, 200, { metrics: { clients: clients.rows[0].count, properties: properties.rows[0].count, investments: investments.rows[0].total, leads: leads.rows[0].count }, enquiries: recent.rows });
      }

      if (method === 'GET' && path === 'admin/properties') {
        const result = await db().query('SELECT * FROM properties ORDER BY created_at DESC');
        return send(res, 200, { properties: result.rows });
      }

      if (method === 'POST' && path === 'admin/properties') {
        const { title, location, type, price, currency='USD', image_url=null, description='', status='available' } = b;
        if (!title || !location || !type || price === undefined) return send(res, 400, { error: 'Title, location, type and price are required.' });
        const result = await db().query('INSERT INTO properties (title,location,type,price,currency,image_url,description,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [cleanText(title,160),cleanText(location,160),cleanText(type,100),Number(price),currency,cleanText(image_url,1000)||null,cleanText(description,5000),status]);
        return send(res, 201, { property: result.rows[0] });
      }

      if (method === 'PATCH' && path.startsWith('admin/properties/')) {
        const id = path.split('/').pop();
        const allowed=['title','location','type','price','currency','image_url','description','status'];
        const entries=Object.entries(b).filter(([k,v])=>allowed.includes(k) && v!==undefined);
        if(!entries.length) return send(res,400,{error:'No fields to update.'});
        if (entries.some(([k,v]) => (k==='price' && (!Number.isFinite(Number(v)) || Number(v)<0)) || (k==='currency' && !currencies.includes(v)) || (k==='status' && !propertyStatuses.includes(v)))) return send(res,400,{error:'Invalid property field value.'});\n        const values=entries.map(([k,v])=>k==='price'?Number(v):typeof v==='string'?cleanText(v,5000):v); const set=entries.map(([k],i)=>k+'=
        values.push(id);
        const result=await db().query('UPDATE properties SET '+set+' WHERE id=$'+values.length+' RETURNING *',values);
        if(!result.rowCount) return send(res,404,{error:'Property not found.'});
        return send(res,200,{property:result.rows[0]});
      }

      if (method === 'DELETE' && path.startsWith('admin/properties/')) {
        const id=path.split('/').pop();
        const result=await db().query('DELETE FROM properties WHERE id=$1 RETURNING id',[id]);
        if(!result.rowCount) return send(res,404,{error:'Property not found.'});
        return send(res,200,{message:'Property deleted.'});
      }

      if (method === 'PATCH' && path.startsWith('admin/enquiries/')) {
        const id=path.split('/').pop();
        const {status}=b;
        if(!['new','qualified','proposal','closed'].includes(status)) return send(res,400,{error:'Invalid enquiry status.'});
        const result=await db().query('UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING id,status',[status,id]);
        if(!result.rowCount) return send(res,404,{error:'Enquiry not found.'});
        return send(res,200,{enquiry:result.rows[0]});
      }

      if (method === 'GET' && path === 'admin/users') {
        const result=await db().query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC");
        return send(res,200,{users:result.rows});
      }
    }

    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: process.env.NODE_ENV === 'production' ? 'Server error.' : error.message });
  }
}
+(i+1)).join(',');
        values.push(id);
        const result=await db().query('UPDATE properties SET '+set+' WHERE id=$'+values.length+' RETURNING *',values);
        if(!result.rowCount) return send(res,404,{error:'Property not found.'});
        return send(res,200,{property:result.rows[0]});
      }

      if (method === 'DELETE' && path.startsWith('admin/properties/')) {
        const id=path.split('/').pop();
        const result=await db().query('DELETE FROM properties WHERE id=$1 RETURNING id',[id]);
        if(!result.rowCount) return send(res,404,{error:'Property not found.'});
        return send(res,200,{message:'Property deleted.'});
      }

      if (method === 'PATCH' && path.startsWith('admin/enquiries/')) {
        const id=path.split('/').pop();
        const {status}=b;
        if(!['new','qualified','proposal','closed'].includes(status)) return send(res,400,{error:'Invalid enquiry status.'});
        const result=await db().query('UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING id,status',[status,id]);
        if(!result.rowCount) return send(res,404,{error:'Enquiry not found.'});
        return send(res,200,{enquiry:result.rows[0]});
      }

      if (method === 'GET' && path === 'admin/users') {
        const result=await db().query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC");
        return send(res,200,{users:result.rows});
      }
    }

    return send(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: process.env.NODE_ENV === 'production' ? 'Server error.' : error.message });
  }
}
