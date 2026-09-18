import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Building2, ChevronDown, Globe2, Menu, Play, X, Search, BriefcaseBusiness, UserRound, BarChart3, LayoutDashboard, LogOut, WalletCards, FolderOpen, MessageSquare, Users, TrendingUp, CircleDollarSign, LoaderCircle } from 'lucide-react';
import './styles.css';

const divisions = [
  { number: '01', title: 'Investment', text: 'Strategic capital and long-term opportunities across high-growth markets.', icon: BarChart3 },
  { number: '02', title: 'Real Estate', text: 'Developing, acquiring and managing places designed for lasting value.', icon: Building2 },
  { number: '03', title: 'Technology', text: 'Digital products and infrastructure that move modern businesses forward.', icon: Globe2 },
  { number: '04', title: 'Business Solutions', text: 'Practical strategy, operations and partnerships for ambitious organizations.', icon: BriefcaseBusiness }
];

const projects = [
  { title: 'Aurelia Business District', location: 'Lagos, Nigeria', type: 'Mixed-use development', value: '$180M', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85' },
  { title: 'Northstar Digital Infrastructure', location: 'London, UK', type: 'Technology', value: '$42M', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=85' },
  { title: 'The Meridian Residences', location: 'Dubai, UAE', type: 'Real estate', value: '$96M', image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85' }
];

const properties = [
  { title: 'Meridian Residence 01', location: 'Dubai, UAE', type: 'Luxury residence', price: '$4.8M' },
  { title: 'Aurelia Tower — Suite 18', location: 'Lagos, Nigeria', type: 'Commercial', price: '$2.1M' },
  { title: 'Westbridge House', location: 'London, UK', type: 'Private office', price: '$6.4M' }
];

const API='/api';
async function request(path, options={}) { const token=localStorage.getItem('abg_token'); const headers={'Content-Type':'application/json',...(options.headers||{})}; if(token) headers.Authorization='Bearer '+token; const response=await fetch(API+path,{...options,headers}); const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.error||'Request failed.'); return data; }

function App() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [route, setRoute] = React.useState(window.location.hash || '#top');
  const [session, setSession] = React.useState(() => localStorage.getItem('abg_token') || '');
  const [user, setUser] = React.useState(null);
  const [authChecking, setAuthChecking] = React.useState(true);
  React.useEffect(() => { const onHash=()=>setRoute(window.location.hash||'#top'); window.addEventListener('hashchange',onHash); const token=localStorage.getItem('abg_token'); if(!token){setAuthChecking(false);return;} request('/me').then(d=>setUser(d.user)).catch(()=>{localStorage.removeItem('abg_token');setSession('');}).finally(()=>setAuthChecking(false)); return()=>window.removeEventListener('hashchange',onHash); }, []);
  const go = hash => { window.location.hash=hash; setOpen(false); };
  const signIn = (token,u) => { localStorage.setItem('abg_token',token); setSession(token); setUser(u); };
  const signOut = () => { localStorage.removeItem('abg_token'); setSession(''); setUser(null); go('#top'); };
  if (authChecking) return <div className="app-page auth-page"><div className="auth-panel"><LoaderCircle className="spin"/><p className="muted">Checking your secure session…</p></div></div>;
  if ((route === '#portal' || route === '#admin') && !session) return <AuthPage onSignIn={(token,u)=>{signIn(token,u);go(u.role==='admin'?'#admin':'#portal');}} admin={route==='#admin'}/>;
  if (route === '#portal') return user?.role === 'admin' ? <AdminPage onSignOut={signOut} go={go}/> : <PortalPage user={user} onSignOut={signOut} go={go}/>;
  if (route === '#admin') return user?.role === 'admin' ? <AdminPage onSignOut={signOut} go={go}/> : <AuthPage onSignIn={(token,u)=>{signIn(token,u);go(u.role==='admin'?'#admin':'#portal');}} admin/>;

  const closeMenu = () => setOpen(false);

  return (
    <div className="site">
      <header className="nav">
        <a className="brand" href="#top"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></a>
        <nav className={open ? 'navlinks open' : 'navlinks'}>
          {['About', 'Business', 'Projects', 'Properties', 'Insights'].map(item => <a key={item} href={'#' + item.toLowerCase()} onClick={closeMenu}>{item}</a>)}
          <button className="portal-btn" onClick={() => go('#portal')}><UserRound size={14}/> Client portal</button>
          <a href="#contact" className="nav-cta" onClick={closeMenu}>Start a conversation <ArrowUpRight size={16}/></a>
        </nav>
        <button className="menu" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-bg" /><div className="hero-overlay" />
          <div className="hero-content">
            <p className="eyebrow">PRIVATE CAPITAL · REAL ESTATE · TECHNOLOGY</p>
            <h1>We build what<br/><em>moves business</em> forward.</h1>
            <p className="hero-copy">Aurelia Business Group brings investment, technology and real estate together to create enduring value across markets.</p>
            <div className="actions"><a className="button primary" href="#business">Explore our business <ArrowUpRight size={17}/></a><a className="button ghost" href="#projects"><Play size={15}/> View our work</a></div>
          </div>
          <div className="scroll">SCROLL TO EXPLORE <ChevronDown size={16}/></div>
        </section>

        <section id="about" className="statement">
          <div className="section-label">01 / WHO WE ARE</div>
          <div><p className="statement-title">We operate where <span>capital, ideas and execution</span> meet.</p><p className="muted">Aurelia is a multidisciplinary business group built around one principle: meaningful value takes a clear vision and the discipline to execute it.</p></div>
        </section>

        <section id="business" className="business section">
          <div className="section-head"><div><p className="section-label">02 / OUR BUSINESS</p><h2>Four disciplines.<br/><em>One direction.</em></h2></div><p className="muted head-copy">From the first investment thesis to the finished development, our businesses are connected by a long-term view.</p></div>
          <div className="division-grid">{divisions.map(d => {const Icon=d.icon; return <article className="division" key={d.number}><span>{d.number}</span><Icon className="division-icon" size={22}/><h3>{d.title}</h3><p>{d.text}</p><a href="#contact">Discover <ArrowUpRight size={15}/></a></article>})}</div>
        </section>

        <section id="projects" className="projects section">
          <div className="section-head"><div><p className="section-label">03 / SELECTED WORK</p><h2>Built for<br/><em>the long term.</em></h2></div><a className="text-link" href="#contact">View all projects <ArrowUpRight size={16}/></a></div>
          <div className="project-grid">{projects.map(p => <article className="project" key={p.title}><div className="project-image"><img src={p.image} alt={p.title}/><span>{p.type}</span></div><div className="project-meta"><div><h3>{p.title}</h3><p>{p.location}</p></div><strong>{p.value}</strong></div></article>)}</div>
        </section>

        <PropertySection query={query} setQuery={setQuery}/>

        <section className="numbers">
          <div><span>$500M+</span><p>Projects & opportunities</p></div><div><span>24+</span><p>Markets reached</p></div><div><span>120+</span><p>Projects & mandates</p></div><div><span>18</span><p>Years of experience</p></div>
        </section>

        <section id="insights" className="insights section">
          <div className="section-head"><div><p className="section-label">05 / INSIGHTS</p><h2>Ideas worth<br/><em>thinking about.</em></h2></div><a className="text-link" href="#contact">All insights <ArrowUpRight size={16}/></a></div>
          <div className="insight-list"><article><span>MARKETS · 06.09.26</span><h3>Why infrastructure is becoming the next competitive advantage.</h3><ArrowUpRight/></article><article><span>REAL ESTATE · 29.08.26</span><h3>Designing places for how people will live next.</h3><ArrowUpRight/></article><article><span>TECHNOLOGY · 14.08.26</span><h3>The quiet infrastructure behind ambitious digital businesses.</h3><ArrowUpRight/></article></div>
        </section>

        <section id="contact" className="contact">
          <div className="contact-inner"><p className="section-label">06 / START A CONVERSATION</p><h2>Let's build something<br/><em>valuable.</em></h2><p>Tell us what you're working on, what you're building, or where you see an opportunity.</p><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const d=await request('/enquiries',{method:'POST',body:JSON.stringify({name:f.get('name'),email:f.get('email'),phone:f.get('phone'),message:f.get('message')})});e.currentTarget.reset();alert(d.message)}catch(err){alert(err.message)}}}><input name="name" required placeholder="Your name"/><input name="email" required type="email" placeholder="Business email"/><input name="phone" type="tel" placeholder="Phone number (optional)"/><textarea name="message" required placeholder="Tell us about your opportunity"/><button className="button light" type="submit">Send enquiry <ArrowUpRight size={17}/></button></form></div>
          <div className="contact-art"><Globe2 size={300} strokeWidth={0.5}/></div>
        </section>
      </main>

      <footer><div className="brand"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></div><p>© 2026 Aurelia Business Group. All rights reserved.</p><div className="footer-links"><a href="#top">Privacy</a><a href="#top">Terms</a><a href="#contact">Contact</a></div></footer>


    </div>
  );
}

function PropertySection({query,setQuery}) {
  const [items,setItems]=React.useState([]),[loading,setLoading]=React.useState(true);
  React.useEffect(()=>{request('/properties').then(d=>setItems(d.properties)).catch(()=>setItems([])).finally(()=>setLoading(false))},[]);
  const shown=items.length?items:properties;
  return <section id="properties" className="properties section"><div className="section-head"><div><p className="section-label">04 / PROPERTY</p><h2>Spaces with<br/><em>purpose.</em></h2></div><div className="property-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search properties..."/></div></div>{loading?<p className="muted">Loading property inventory…</p>:null}{error?<p className="form-error">{error}</p>:null}{!loading&&!error&&!shown.length?<p className="muted">No properties are currently available.</p>:null}<div className="property-grid">{shown.filter(item=>(item.title+item.location+item.type).toLowerCase().includes(query.toLowerCase())).map(item=><article className="property-card" key={item.id||item.title}><div className="property-mark"><Building2 size={22}/></div><span>{item.type}</span><h3>{item.title}</h3><p>{item.location}</p><strong>{item.currency?new Intl.NumberFormat('en-US',{style:'currency',currency:item.currency,maximumFractionDigits:0}).format(Number(item.price)):item.price}</strong><a href="#contact">Request details <ArrowUpRight size={15}/></a></article>)}</div></section>;
}

function AuthPage({ onSignIn, admin=false }) {
  const [register,setRegister]=React.useState(!admin), [busy,setBusy]=React.useState(false), [error,setError]=React.useState('');
  const submit=async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const data=await request(register?'/auth/register':'/auth/login',{method:'POST',body:JSON.stringify({name:f.get('name'),email:f.get('email'),password:f.get('password')})});onSignIn(data.token,data.user)}catch(err){setError(err.message)}finally{setBusy(false)}};
  return <div className="app-page auth-page"><div className="auth-panel"><a className="brand dark-brand" href="#top"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></a><p className="section-label">{admin?'ADMIN ACCESS':'CLIENT PORTAL'}</p><h1>{admin?'Platform administration.':register?'Create your client account.':'Welcome back.'}</h1><p className="muted">{admin?'Sign in with an administrator account.':register?'Create a secure account to access your Aurelia workspace.':'Sign in to access your Aurelia workspace.'}</p><form onSubmit={submit}>{register&&!admin?<label>Full name<input required name="name" placeholder="Your full name"/></label>:null}<label>Email<input required name="email" type="email" placeholder="name@company.com"/></label><label>Password<input required name="password" minLength="8" type="password" placeholder="Minimum 8 characters"/></label>{error?<p className="form-error">{error}</p>:null}<button className="button dark-button" disabled={busy} type="submit">{busy?'Please wait…':register?'Create account':'Sign in'} <ArrowUpRight size={16}/></button></form>{!admin?<button className="auth-toggle" onClick={()=>{setRegister(!register);setError('')}}>{register?'Already have an account? Sign in':'New client? Create an account'}</button>:null}<small className="demo-note">Authentication is handled by the Aurelia API. No demo credentials are used.</small><a className="back-link" href="#top">← Return to Aurelia</a></div></div>;
}

function DashboardNav({ title, onSignOut, go, admin }) {
  return <header className="dashboard-nav"><a className="brand dark-brand" href="#top"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></a><span className="workspace-title">{title}</span><nav><button onClick={()=>go(admin?'#admin':'#portal')}><LayoutDashboard size={15}/> Overview</button><button onClick={()=>go('#top')}><Globe2 size={15}/> Website</button><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></nav></header>;
}

function PortalPage({user,onSignOut,go}) {
  const [data,setData]=React.useState(null),[error,setError]=React.useState('');
  React.useEffect(()=>{request('/portal').then(setData).catch(e=>setError(e.message))},[]);
  if(error)return <div className="app-page auth-page"><div className="auth-panel"><p className="form-error">{error}</p><button className="button dark-button" onClick={onSignOut}>Sign out</button></div></div>;
  if(!data)return <div className="app-page auth-page"><div className="auth-panel"><LoaderCircle className="spin"/><p className="muted">Loading your secure workspace…</p></div></div>;
  const cards=[['Portfolio value','$'+Number(data.portfolioValue).toLocaleString(),TrendingUp],['Active investments',data.investments.length,WalletCards],['Documents',data.documents.length,FolderOpen],['Open enquiries',data.enquiries.filter(x=>x.status!=='closed').length,MessageSquare]];
  return <div className="app-page dashboard-page"><DashboardNav title="Client workspace" onSignOut={onSignOut} go={go}/><main className="dashboard-content"><div className="dashboard-intro"><div><p className="section-label">CLIENT PORTAL</p><h1>Good morning, <em>{user.name.split(' ')[0]}.</em></h1><p className="muted">Your live investments, documents and enquiries.</p></div><button className="button dark-button" onClick={()=>go('#contact')}>Start an enquiry <ArrowUpRight size={16}/></button></div><div className="metric-grid">{cards.map(([label,value,Icon])=><article className="metric-card" key={label}><Icon/><span>{label}</span><strong>{value}</strong></article>)}</div><div className="dashboard-grid"><section className="dashboard-card"><p className="section-label">PORTFOLIO</p><h2>Investment overview</h2>{data.investments.length?data.investments.map(item=><div className="portfolio-row" key={item.id}><span>{item.name}</span><strong>${Number(item.value).toLocaleString()}</strong><small>+{item.return_percent}%</small></div>):<p className="muted">No investments assigned yet.</p>}</section><section className="dashboard-card"><p className="section-label">RECENT ACTIVITY</p><h2>Latest enquiries</h2>{data.enquiries.length?data.enquiries.slice(0,5).map(item=><div className="activity" key={item.id}><span>{new Date(item.created_at).toLocaleDateString()}</span><p>{item.message}</p></div>):<p className="muted">No enquiries yet.</p>}</section></div></main></div>;
}

function AdminPage({onSignOut,go}) {
  const [data,setData]=React.useState(null),[properties,setProperties]=React.useState([]),[users,setUsers]=React.useState([]),[investments,setInvestments]=React.useState([]),[documents,setDocuments]=React.useState([]),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
  const [newProperty,setNewProperty]=React.useState({title:'',location:'',type:'',price:'',currency:'USD',description:'',image_url:''}); const [newInvestment,setNewInvestment]=React.useState({user_id:'',name:'',value:'',return_percent:'',status:'active'}); const [newDocument,setNewDocument]=React.useState({user_id:'',name:'',file_url:''});
  const load=async()=>{try{const [overview,props,usr,inv,docs]=await Promise.all([request('/admin/overview'),request('/admin/properties'),request('/admin/users'),request('/admin/investments'),request('/admin/documents')]);setData(overview);setProperties(props.properties);setUsers(usr.users);setInvestments(inv.investments);setDocuments(docs.documents);setError('')}catch(e){setError(e.message)}};
  React.useEffect(()=>{load()},[]);
  const createProperty=async e=>{e.preventDefault();setBusy(true);try{await request('/admin/properties',{method:'POST',body:JSON.stringify({...newProperty,price:Number(newProperty.price)})});setNewProperty({title:'',location:'',type:'',price:'',currency:'USD',description:''});await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
  const createInvestment=async e=>{e.preventDefault();setBusy(true);try{await request('/admin/investments',{method:'POST',body:JSON.stringify({...newInvestment,value:Number(newInvestment.value),return_percent:Number(newInvestment.return_percent||0)})});setNewInvestment({user_id:'',name:'',value:'',return_percent:'',status:'active'});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}; const removeInvestment=async id=>{if(!window.confirm('Delete this investment?'))return;setBusy(true);try{await request('/admin/investments/'+id,{method:'DELETE'});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}; const createDocument=async e=>{e.preventDefault();setBusy(true);try{await request('/admin/documents',{method:'POST',body:JSON.stringify(newDocument)});setNewDocument({user_id:'',name:'',file_url:''});await load()}catch(e){setError(e.message)}finally{setBusy(false)}}; const removeProperty=async id=>{if(!window.confirm('Delete this property?'))return;setBusy(true);try{await request('/admin/properties/'+id,{method:'DELETE'});await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
  const updateStatus=async(id,status)=>{try{await request('/admin/enquiries/'+id,{method:'PATCH',body:JSON.stringify({status})});await load()}catch(e){setError(e.message)}};
  if(error&&!data)return <div className="app-page auth-page"><div className="auth-panel"><p className="form-error">{error}</p><button className="button dark-button" onClick={onSignOut}>Sign out</button></div></div>;
  if(!data)return <div className="app-page auth-page"><div className="auth-panel"><LoaderCircle className="spin"/><p className="muted">Loading administration workspace…</p></div></div>;
  const items=[['Clients',data.metrics.clients,Users],['Properties',data.metrics.properties,Building2],['Investments','$'+Number(data.metrics.investments).toLocaleString(),CircleDollarSign],['Open leads',data.metrics.leads,TrendingUp]];
  return <div className="app-page dashboard-page"><DashboardNav title="Administration" onSignOut={onSignOut} go={go} admin/><main className="dashboard-content">
    <div className="dashboard-intro"><div><p className="section-label">ADMINISTRATION</p><h1>Platform <em>control center.</em></h1><p className="muted">Manage live platform records and incoming opportunities.</p></div></div>
    {error?<p className="form-error">{error}</p>:null}
    <div className="metric-grid">{items.map(([label,value,Icon])=><article className="metric-card" key={label}><Icon/><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="dashboard-grid">
      <section className="dashboard-card"><div className="card-head"><div><p className="section-label">PROPERTY INVENTORY</p><h2>Add property</h2></div></div><form className="admin-form" onSubmit={createProperty}><input required value={newProperty.title} onChange={e=>setNewProperty({...newProperty,title:e.target.value})} placeholder="Property title"/><input required value={newProperty.location} onChange={e=>setNewProperty({...newProperty,location:e.target.value})} placeholder="Location"/><input required value={newProperty.type} onChange={e=>setNewProperty({...newProperty,type:e.target.value})} placeholder="Type"/><input required type="number" min="0" step="0.01" value={newProperty.price} onChange={e=>setNewProperty({...newProperty,price:e.target.value})} placeholder="Price"/><select value={newProperty.currency} onChange={e=>setNewProperty({...newProperty,currency:e.target.value})}><option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option></select><input value={newProperty.image_url||''} onChange={e=>setNewProperty({...newProperty,image_url:e.target.value})} placeholder="Image URL (optional)"/><textarea value={newProperty.description} onChange={e=>setNewProperty({...newProperty,description:e.target.value})} placeholder="Description"/><button disabled={busy} className="button dark-button">{busy?'Saving…':'Add property'} <ArrowUpRight size={15}/></button></form></section>
      <section className="dashboard-card"><p className="section-label">USERS</p><h2>Accounts</h2><div className="activity-list">{users.slice(0,8).map(x=><div className="activity" key={x.id}><span>{x.role}</span><p>{x.name}<br/><small>{x.email}</small></p></div>)}</div></section>
    </div>
<div className="dashboard-grid"><section className="dashboard-card"><p className="section-label">INVESTMENTS</p><h2>Assign investment</h2><form className="admin-form" onSubmit={createInvestment}><select required value={newInvestment.user_id} onChange={e=>setNewInvestment({...newInvestment,user_id:e.target.value})}><option value="">Select client</option>{users.filter(x=>x.role==='client').map(x=><option key={x.id} value={x.id}>{x.name} — {x.email}</option>)}</select><input required value={newInvestment.name} onChange={e=>setNewInvestment({...newInvestment,name:e.target.value})} placeholder="Investment name"/><input required type="number" min="0" step="0.01" value={newInvestment.value} onChange={e=>setNewInvestment({...newInvestment,value:e.target.value})} placeholder="Value"/><input type="number" step="0.01" value={newInvestment.return_percent} onChange={e=>setNewInvestment({...newInvestment,return_percent:e.target.value})} placeholder="Return %"/><button disabled={busy} className="button dark-button">Assign investment <ArrowUpRight size={15}/></button></form></section><section className="dashboard-card"><p className="section-label">DOCUMENTS</p><h2>Add secure document link</h2><form className="admin-form" onSubmit={createDocument}><select required value={newDocument.user_id} onChange={e=>setNewDocument({...newDocument,user_id:e.target.value})}><option value="">Select client</option>{users.filter(x=>x.role==='client').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><input required value={newDocument.name} onChange={e=>setNewDocument({...newDocument,name:e.target.value})} placeholder="Document name"/><input required type="url" value={newDocument.file_url} onChange={e=>setNewDocument({...newDocument,file_url:e.target.value})} placeholder="Secure file URL"/><button disabled={busy} className="button dark-button">Add document <ArrowUpRight size={15}/></button></form></section></div><section className="dashboard-card admin-table"><div className="card-head"><div><p className="section-label">INVESTMENTS</p><h2>Assigned investments</h2></div></div><div className="table-row table-head"><span>Client</span><span>Investment</span><span>Value</span><span>Action</span></div>{investments.map(x=><div className="table-row" key={x.id}><span>{x.user_name}</span><span>{x.name}</span><span>{Number(x.value).toLocaleString()}</span><button className="table-action" onClick={()=>removeInvestment(x.id)}>Delete</button></div>)}</section>
    <section className="dashboard-card admin-table"><div className="card-head"><div><p className="section-label">PROPERTY INVENTORY</p><h2>Live properties</h2></div></div><div className="table-row table-head"><span>Property</span><span>Location</span><span>Price</span><span>Action</span></div>{properties.map(p=><div className="table-row" key={p.id}><span>{p.title}</span><span>{p.location}</span><span>{p.currency} {Number(p.price).toLocaleString()}</span><button className="table-action" onClick={()=>removeProperty(p.id)}>Delete</button></div>)}</section>
    <section className="dashboard-card admin-table"><div className="card-head"><div><p className="section-label">LEAD PIPELINE</p><h2>Recent enquiries</h2></div></div><div className="table-row table-head"><span>Name</span><span>Email</span><span>Status</span><span>Date</span></div>{data.enquiries.map(item=><div className="table-row" key={item.id}><span>{item.name}</span><span>{item.email}</span><select value={item.status} onChange={e=>updateStatus(item.id,e.target.value)}><option value="new">new</option><option value="qualified">qualified</option><option value="proposal">proposal</option><option value="closed">closed</option></select><span>{new Date(item.created_at).toLocaleDateString()}</span></div>)}</section>
  </main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
