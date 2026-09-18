import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
function body(req) { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { throw Object.assign(new Error('Invalid JSON body.'), { statusCode: 400 }); } }\nfunction cleanText(value, max=5000) { return typeof value === 'string' ? value.trim().slice(0,max) : ''; }\nfunction validEmail(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }

export default async function handler(req, res) {
  try {
    const path = (req.query.path || []).join('/');
    const method = req.method;
    const b = body(req);

    if (method === 'GET' && path === 'health') return send(res, 200, { ok: true, service: 'aurelia-api' });

    if (method === 'POST' && path === 'auth/register') {
      const { name, email, password } = b;
      if (!name || !email || !password || password.length < 8) return send(res, 400, { error: 'Name, email and an 8-character password are required.' });
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
      if (!name || !email || !message) return send(res, 400, { error: 'Name, email and message are required.' });
      const u = auth(req);
      await db().query('INSERT INTO enquiries (user_id,name,email,phone,message,status) VALUES ($1,$2,$3,$4,$5,$6)', [u?.sub || null, name.trim(), email.toLowerCase(), phone || null, message.trim(), 'new']);
      return send(res, 201, { message: 'Your enquiry has been received.' });
    }

    if (method === 'GET' && path === 'properties') {
      const result = await db().query('SELECT id,title,location,type,price,currency,image_url,description,status FROM properties WHERE status=$1 ORDER BY created_at DESC', ['available']);
      return send(res, 200, { properties: result.rows });
    }

    const u = auth(req);
    if (!u) return send(res, 401, { error: 'Authentication required.' });

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
        const result = await db().query('INSERT INTO properties (title,location,type,price,currency,image_url,description,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [title.trim(),location.trim(),type.trim(),price,currency,image_url,description,status]);
        return send(res, 201, { property: result.rows[0] });
      }

      if (method === 'PATCH' && path.startsWith('admin/properties/')) {
        const id = path.split('/').pop();
        const allowed=['title','location','type','price','currency','image_url','description','status'];
        const entries=Object.entries(b).filter(([k,v])=>allowed.includes(k) && v!==undefined);
        if(!entries.length) return send(res,400,{error:'No fields to update.'});
        const values=entries.map(([,v])=>v); const set=entries.map(([k],i)=>k+'=$'+(i+1)).join(',');
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
