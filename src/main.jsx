import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Building2, ChevronDown, Globe2, Menu, Play, X, Search, ShieldCheck, BriefcaseBusiness, UserRound, FileText, BarChart3, LayoutDashboard, LogOut, WalletCards, FolderOpen, MessageSquare, Users, TrendingUp, CircleDollarSign } from 'lucide-react';
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

function App() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [route, setRoute] = React.useState(window.location.hash || '#top');
  const [session, setSession] = React.useState(() => localStorage.getItem('abg_session') || '');
  const [role, setRole] = React.useState(() => localStorage.getItem('abg_role') || 'client');
  React.useEffect(() => { const onHash=()=>setRoute(window.location.hash||'#top'); window.addEventListener('hashchange',onHash); return()=>window.removeEventListener('hashchange',onHash); }, []);
  const go = hash => { window.location.hash=hash; setOpen(false); };
  const signIn = (selectedRole='client') => { localStorage.setItem('abg_session','demo-session'); localStorage.setItem('abg_role',selectedRole); setSession('demo-session'); setRole(selectedRole); go(selectedRole==='admin'?'#admin':'#portal'); };
  const signOut = () => { localStorage.removeItem('abg_session'); localStorage.removeItem('abg_role'); setSession(''); setRole('client'); go('#top'); };
  if (route === '#portal' && !session) return <AuthPage onSignIn={signIn}/>;
  if (route === '#admin' && !session) return <AuthPage onSignIn={signIn} admin/>;
  if (route === '#portal') return role === 'admin' ? <AdminPage onSignOut={signOut} go={go}/> : <PortalPage onSignOut={signOut} go={go}/>;
  if (route === '#admin') return role === 'admin' ? <AdminPage onSignOut={signOut} go={go}/> : <AuthPage onSignIn={signIn} admin/>;

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

        <section id="properties" className="properties section">
          <div className="section-head"><div><p className="section-label">04 / PROPERTY</p><h2>Spaces with<br/><em>purpose.</em></h2></div><div className="property-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search properties..." /></div></div>
          <div className="property-grid">{properties.filter(p => (p.title+p.location+p.type).toLowerCase().includes(query.toLowerCase())).map(p=><article className="property-card" key={p.title}><div className="property-mark"><Building2 size={22}/></div><span>{p.type}</span><h3>{p.title}</h3><p>{p.location}</p><strong>{p.price}</strong><a href="#contact">Request details <ArrowUpRight size={15}/></a></article>)}</div>
        </section>

        <section className="numbers">
          <div><span>$500M+</span><p>Projects & opportunities</p></div><div><span>24+</span><p>Markets reached</p></div><div><span>120+</span><p>Projects & mandates</p></div><div><span>18</span><p>Years of experience</p></div>
        </section>

        <section id="insights" className="insights section">
          <div className="section-head"><div><p className="section-label">05 / INSIGHTS</p><h2>Ideas worth<br/><em>thinking about.</em></h2></div><a className="text-link" href="#contact">All insights <ArrowUpRight size={16}/></a></div>
          <div className="insight-list"><article><span>MARKETS · 06.09.26</span><h3>Why infrastructure is becoming the next competitive advantage.</h3><ArrowUpRight/></article><article><span>REAL ESTATE · 29.08.26</span><h3>Designing places for how people will live next.</h3><ArrowUpRight/></article><article><span>TECHNOLOGY · 14.08.26</span><h3>The quiet infrastructure behind ambitious digital businesses.</h3><ArrowUpRight/></article></div>
        </section>

        <section id="contact" className="contact">
          <div className="contact-inner"><p className="section-label">06 / START A CONVERSATION</p><h2>Let's build something<br/><em>valuable.</em></h2><p>Tell us what you're working on, what you're building, or where you see an opportunity.</p><form onSubmit={e=>{e.preventDefault();alert('Thank you. Your enquiry has been captured for the Aurelia team.')}}><input required placeholder="Your name"/><input required type="email" placeholder="Business email"/><textarea required placeholder="Tell us about your opportunity"/><button className="button light" type="submit">Send enquiry <ArrowUpRight size={17}/></button></form></div>
          <div className="contact-art"><Globe2 size={300} strokeWidth={0.5}/></div>
        </section>
      </main>

      <footer><div className="brand"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></div><p>© 2026 Aurelia Business Group. All rights reserved.</p><div className="footer-links"><a href="#top">Privacy</a><a href="#top">Terms</a><a href="#contact">Contact</a></div></footer>


    </div>
  );
}

function AuthPage({ onSignIn, admin=false }) {
  return <div className="app-page auth-page"><div className="auth-panel">
    <a className="brand dark-brand" href="#top"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></a>
    <p className="section-label">{admin ? 'ADMIN ACCESS' : 'CLIENT PORTAL'}</p>
    <h1>{admin ? 'Platform administration.' : 'Your business, securely connected.'}</h1>
    <p className="muted">Sign in to continue to the {admin ? 'administration workspace' : 'client workspace'}.</p>
    <form onSubmit={e=>{e.preventDefault();onSignIn(admin?'admin':'client');}}><label>Email<input required type="email" placeholder="name@company.com"/></label><label>Password<input required type="password" placeholder="••••••••"/></label><button className="button dark-button" type="submit">Sign in <ArrowUpRight size={16}/></button></form>
    <small className="demo-note">Demo access is stored locally in this browser. Connect a production identity provider before using this for real client accounts.</small>
    <div className="auth-switch"><button type="button" onClick={()=>onSignIn('client')}>Client demo</button>{admin ? null : <button type="button" onClick={()=>onSignIn('admin')}>Admin demo</button>}</div><a className="back-link" href="#top">← Return to Aurelia</a>
  </div></div>;
}

function DashboardNav({ title, onSignOut, go, admin }) {
  return <header className="dashboard-nav"><a className="brand dark-brand" href="#top"><span>ABG</span><small>AURELIA BUSINESS GROUP</small></a><span className="workspace-title">{title}</span><nav><button onClick={()=>go(admin?'#admin':'#portal')}><LayoutDashboard size={15}/> Overview</button><button onClick={()=>go('#top')}><Globe2 size={15}/> Website</button><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></nav></header>;
}

function PortalPage({ onSignOut, go }) {
  const cards=[['Portfolio value','$12.84M',TrendingUp],['Active investments','08',WalletCards],['Documents','24',FolderOpen],['Open enquiries','03',MessageSquare]];
  return <div className="app-page dashboard-page"><DashboardNav title="Client workspace" onSignOut={onSignOut} go={go}/><main className="dashboard-content">
    <div className="dashboard-intro"><div><p className="section-label">CLIENT PORTAL</p><h1>Good morning, <em>Partner.</em></h1><p className="muted">Your investments, documents and active opportunities in one workspace.</p></div><button className="button dark-button" onClick={()=>go('#contact')}>Start an enquiry <ArrowUpRight size={16}/></button></div>
    <div className="metric-grid">{cards.map(([label,value,Icon])=><article className="metric-card" key={label}><Icon/><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="dashboard-grid"><section className="dashboard-card"><div className="card-head"><div><p className="section-label">PORTFOLIO</p><h2>Investment overview</h2></div></div>{[['Aurelia Growth Fund','$7.20M','+8.4%'],['Meridian Real Estate','$3.64M','+5.1%'],['Northstar Infrastructure','$2.00M','+11.2%']].map(r=><div className="portfolio-row" key={r[0]}><span>{r[0]}</span><strong>{r[1]}</strong><small>{r[2]}</small></div>)}</section><section className="dashboard-card"><p className="section-label">RECENT ACTIVITY</p><h2>Latest updates</h2><div className="activity"><span>12 Sep</span><p>Quarterly statement available</p></div><div className="activity"><span>08 Sep</span><p>Meridian project update posted</p></div><div className="activity"><span>02 Sep</span><p>New document added to your workspace</p></div></section></div>
  </main></div>;
}

function AdminPage({ onSignOut, go }) {
  const items=[['Clients','128',Users],['Properties','36',Building2],['Investments','$84.2M',CircleDollarSign],['Open leads','47',TrendingUp]];
  return <div className="app-page dashboard-page"><DashboardNav title="Administration" onSignOut={onSignOut} go={go} admin/><main className="dashboard-content">
    <div className="dashboard-intro"><div><p className="section-label">ADMINISTRATION</p><h1>Platform <em>overview.</em></h1><p className="muted">Central workspace for users, properties, opportunities and platform operations.</p></div></div>
    <div className="metric-grid">{items.map(([label,value,Icon])=><article className="metric-card" key={label}><Icon/><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="dashboard-card admin-table"><div className="card-head"><div><p className="section-label">LEAD PIPELINE</p><h2>Recent opportunities</h2></div></div><div className="table-row table-head"><span>Company</span><span>Division</span><span>Stage</span><span>Value</span></div>{[['Atlas Holdings','Investment','Qualified','$8.5M'],['Meridian Partners','Real Estate','Proposal','$4.2M'],['Nova Systems','Technology','Discovery','$1.8M']].map(r=><div className="table-row" key={r[0]}>{r.map(v=><span key={v}>{v}</span>)}</div>)}</section>
  </main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
