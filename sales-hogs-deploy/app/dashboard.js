'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── constants ────────────────────────────────────────────────────────────────
const HOGS = [
  { id: 'mitch', name: 'Mitch', role: 'Founder', city: 'Melbourne', color: '#E8C547' },
  { id: 'kat',   name: 'Kat',   role: 'Sydney Lead', city: 'Sydney',    color: '#5EC4B6' },
  { id: 'chris', name: 'Chris', role: 'Sydney Director', city: 'Sydney', color: '#E87B47' },
  { id: 'gab',   name: 'Gab',   role: 'Architectural Director', city: 'Melbourne', color: '#C47BE8' },
  { id: 'matt',  name: 'Matt',  role: 'Associate (New Business)', city: 'Melbourne', color: '#7BE87B' },
];

const TARGETS = {
  total: 3600000, melb: 2500000, syd: 1100000,
  avgFee: 90000, closeRate: 0.40,
  oppsNeeded: Math.ceil(3600000 / 90000 / 0.40),
  organicLeads: 30,
  roadshowsPerYear: 20,
  roadshowFreqDays: 14,
};

const DEAL_STAGES = ['Prospect','Qualified','Proposal Sent','Negotiation','Won','Lost'];
const STAGE_COLORS = {
  'Prospect':'#555','Qualified':'#E8C547','Proposal Sent':'#E87B47',
  'Negotiation':'#C47BE8','Won':'#7BE87B','Lost':'#E85A5A'
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0,10);
const fmt = (n) => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(n);
const fmtShort = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}k`;
const getTradingDaysInMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const days = [];
  let cur = new Date(year, month, 1);
  while (cur.getMonth() === month) {
    const dow = cur.getDay();
    if (dow >= 2 && dow <= 5) days.push(cur.toISOString().slice(0,10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return days;
};
const monthLabel = () => new Date().toLocaleString('en-AU',{month:'long',year:'numeric'});

// ─── storage wrapper ──────────────────────────────────────────────────────────
const store = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  }
};

// ─── seed data ────────────────────────────────────────────────────────────────
const seedGoNetwork = () => HOGS.flatMap(h =>
  Array.from({length: 5}, (_,i) => ({
    id: `${h.id}-go-${i}`,
    hogId: h.id,
    name: ['James Whitfield','Sarah Chen','Tom Nguyen','Priya Mehta','Luke Barker',
           'Emma Frost','Daniel Park','Ava Liu','Marcus Reed','Zara Hill'][i + (h.id==='mitch'?0:h.id==='kat'?2:h.id==='chris'?4:h.id==='gab'?1:3) % 10],
    firm: ['Acuity','GPT Group','Charter Hall','CBRE','Colliers',
           'JLL','Knight Frank','Cushman','Savills','DEXUS'][i + (HOGS.findIndex(x=>x.id===h.id)*2) % 10],
    role: ['Tenant Rep','Portfolio Manager','Project Manager','Director','Associate'][i%5],
    wingmanId: HOGS[(HOGS.findIndex(x=>x.id===h.id)+1)%HOGS.length].id,
    lastContact: null, lastContactNote: '', opps: 0, touchpoints: 0,
  }))
);

const seedDeals = () => [
  { id:'d1', name:'Project Mood – Bathhouse', firm:'Private Client', value:90000, stage:'Proposal Sent', hogId:'mitch', city:'Melbourne', notes:'Michael Matrah. Q&A stage.', createdAt:'2026-04-10' },
  { id:'d2', name:'Collins St Office Fitout', firm:'Charter Hall', value:130000, stage:'Qualified', hogId:'gab', city:'Melbourne', notes:'Intro via Sarah Chen.', createdAt:'2026-04-18' },
  { id:'d3', name:'Surry Hills Creative Hub', firm:'GPT Group', value:85000, stage:'Prospect', hogId:'kat', city:'Sydney', notes:'Initial meeting done.', createdAt:'2026-04-28' },
];

const seedRoadshows = () => [
  { id:'rs1', title:'Q1 Roadshow – TRs & PMs', date:'2026-07-15', city:'Melbourne', leadHog:'mitch', reps:['mitch','gab','matt'], venue:'Private Dining, Chinatown', status:'Planned', attendees:10, followUp30:false, followUp90:false, followUp365:false },
  { id:'rs2', title:'Q1 Roadshow – Sydney', date:'2026-07-29', city:'Sydney', leadHog:'kat', reps:['kat','chris','mitch'], venue:'Ace Hotel, Surry Hills', status:'Planned', attendees:0, followUp30:false, followUp90:false, followUp365:false },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function PipelineBar({ deals }) {
  const won = deals.filter(d=>d.stage==='Won').reduce((s,d)=>s+d.value,0);
  const active = deals.filter(d=>!['Won','Lost'].includes(d.stage)).reduce((s,d)=>s+d.value,0);
  const pct = Math.min(100, (won/TARGETS.total)*100);
  const activePct = Math.min(100-pct, (active/TARGETS.total)*100);
  const oppsCreated = deals.filter(d=>d.stage!=='Lost').length;
  const oppsGap = Math.max(0, TARGETS.oppsNeeded - TARGETS.organicLeads);
  return (
    <div style={{background:'#111',border:'1px solid #2a2a2a',borderRadius:12,padding:'24px 28px',marginBottom:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{fontSize:11,letterSpacing:3,color:'#666',textTransform:'uppercase',marginBottom:6}}>FY Pipeline</div>
          <div style={{fontSize:32,fontFamily:"'DM Serif Display',serif",color:'#fff'}}>{fmtShort(won+active)} <span style={{fontSize:14,color:'#555'}}>/ {fmtShort(TARGETS.total)}</span></div>
        </div>
        <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
          {[
            {label:'Opps Needed',val:TARGETS.oppsNeeded,sub:'excl. organic'},
            {label:'Organic / GO',val:TARGETS.organicLeads,sub:'baseline'},
            {label:'Gap to Fill',val:oppsGap,sub:'via activity'},
            {label:'Roadshows Needed',val:TARGETS.roadshowsPerYear,sub:'1 every 2 wks'},
          ].map(m=>(
            <div key={m.label} style={{textAlign:'right'}}>
              <div style={{fontSize:24,fontFamily:"'DM Serif Display',serif",color:'#E8C547'}}>{m.val}</div>
              <div style={{fontSize:10,color:'#666',textTransform:'uppercase',letterSpacing:2}}>{m.label}</div>
              <div style={{fontSize:10,color:'#444'}}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{height:8,background:'#1e1e1e',borderRadius:4,overflow:'hidden',display:'flex'}}>
        <div style={{width:`${pct}%`,background:'#7BE87B',transition:'width 0.6s ease'}}/>
        <div style={{width:`${activePct}%`,background:'#E8C547',transition:'width 0.6s ease'}}/>
      </div>
      <div style={{display:'flex',gap:20,marginTop:10,fontSize:11,color:'#555'}}>
        <span><span style={{color:'#7BE87B'}}>■</span> Won {fmtShort(won)}</span>
        <span><span style={{color:'#E8C547'}}>■</span> Active {fmtShort(active)}</span>
        <span style={{marginLeft:'auto',color:'#444'}}>Melb target {fmtShort(TARGETS.melb)} · Syd target {fmtShort(TARGETS.syd)}</span>
      </div>
    </div>
  );
}

function HogAvatar({hog, size=32, selected, onClick}) {
  return (
    <div onClick={onClick} title={hog.name} style={{
      width:size,height:size,borderRadius:'50%',background:hog.color+'33',
      border:`2px solid ${selected?hog.color:'#333'}`,display:'flex',alignItems:'center',
      justifyContent:'center',fontSize:size*0.38,fontWeight:700,color:hog.color,
      cursor:onClick?'pointer':'default',flexShrink:0,transition:'border-color 0.2s',
      fontFamily:"'DM Serif Display',serif"
    }}>{hog.name[0]}</div>
  );
}

function GoNetworkTab({ goNetwork, setGoNetwork, activeHog, setActiveHog }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const hogContacts = goNetwork.filter(c => c.hogId === activeHog);
  const daysSince = (dateStr) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  };
  const freshness = (days) => {
    if (days === null) return { color:'#555', label:'Never' };
    if (days <= 14) return { color:'#7BE87B', label:`${days}d ago` };
    if (days <= 45) return { color:'#E8C547', label:`${days}d ago` };
    return { color:'#E85A5A', label:`${days}d ago` };
  };

  const save = () => {
    const updated = goNetwork.map(c => c.id === editing ? {...c, ...form} : c);
    setGoNetwork(updated);
    setEditing(null);
  };

  const logContact = (id) => {
    const note = prompt('Quick note on today\'s touchpoint (optional):');
    const updated = goNetwork.map(c => c.id === id
      ? {...c, lastContact: today(), lastContactNote: note||'', touchpoints: (c.touchpoints||0)+1}
      : c);
    setGoNetwork(updated);
  };

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {HOGS.map(h=>(
          <button key={h.id} onClick={()=>setActiveHog(h.id)} style={{
            padding:'8px 16px',borderRadius:20,border:`1.5px solid ${activeHog===h.id?h.color:'#2a2a2a'}`,
            background:activeHog===h.id?h.color+'22':'transparent',color:activeHog===h.id?h.color:'#666',
            cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.2s'
          }}>{h.name}</button>
        ))}
      </div>

      <div style={{display:'grid',gap:12}}>
        {hogContacts.map(c => {
          const days = daysSince(c.lastContact);
          const f = freshness(days);
          const wingman = HOGS.find(h=>h.id===c.wingmanId);
          return (
            <div key={c.id} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:10,padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'center'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                  <span style={{fontSize:15,fontWeight:700,color:'#fff',fontFamily:"'DM Serif Display',serif"}}>{c.name}</span>
                  <span style={{fontSize:11,color:'#555',background:'#1a1a1a',padding:'2px 8px',borderRadius:20}}>{c.role}</span>
                  <span style={{fontSize:11,color:'#444'}}>{c.firm}</span>
                </div>
                <div style={{display:'flex',gap:16,fontSize:12,color:'#555',alignItems:'center',flexWrap:'wrap'}}>
                  <span>Last contact: <span style={{color:f.color,fontWeight:600}}>{f.label}</span></span>
                  {c.lastContactNote && <span style={{color:'#444',fontStyle:'italic'}}>"{c.lastContactNote}"</span>}
                  <span>Touchpoints: <span style={{color:'#E8C547'}}>{c.touchpoints||0}</span></span>
                  <span>Opps: <span style={{color:'#7BE87B'}}>{c.opps||0}</span></span>
                  {wingman && <span>Wingman: <span style={{color:wingman.color}}>{wingman.name}</span></span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>logContact(c.id)} style={{
                  padding:'6px 14px',borderRadius:6,border:'1px solid #E8C54733',
                  background:'#E8C54711',color:'#E8C547',cursor:'pointer',fontSize:12,fontWeight:600
                }}>+ Touchpoint</button>
                <button onClick={()=>{ setEditing(c.id); setForm({name:c.name,firm:c.firm,role:c.role,opps:c.opps,wingmanId:c.wingmanId}); }} style={{
                  padding:'6px 14px',borderRadius:6,border:'1px solid #2a2a2a',
                  background:'transparent',color:'#555',cursor:'pointer',fontSize:12
                }}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div style={{position:'fixed',inset:0,background:'#000a',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#141414',border:'1px solid #2a2a2a',borderRadius:14,padding:28,width:420,maxWidth:'90vw'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:20,fontFamily:"'DM Serif Display',serif"}}>Edit Contact</div>
            {[['name','Name'],['firm','Firm'],['role','Role']].map(([f,l])=>(
              <div key={f} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>{l}</label>
                <input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} style={{
                  width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                  padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
                }}/>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>Opps Surfaced</label>
              <input type="number" value={form.opps||0} onChange={e=>setForm({...form,opps:+e.target.value})} style={{
                width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
              }}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>Wingman</label>
              <select value={form.wingmanId||''} onChange={e=>setForm({...form,wingmanId:e.target.value})} style={{
                width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
              }}>
                {HOGS.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setEditing(null)} style={{padding:'8px 18px',borderRadius:6,border:'1px solid #2a2a2a',background:'transparent',color:'#666',cursor:'pointer'}}>Cancel</button>
              <button onClick={save} style={{padding:'8px 18px',borderRadius:6,border:'none',background:'#E8C547',color:'#000',cursor:'pointer',fontWeight:700}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DealsTab({ deals, setDeals }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'',firm:'',value:90000,stage:'Prospect',hogId:'mitch',city:'Melbourne',notes:'' });

  const addDeal = () => {
    const deal = { ...form, id: `d${Date.now()}`, createdAt: today() };
    setDeals([...deals, deal]);
    setShowForm(false);
    setForm({ name:'',firm:'',value:90000,stage:'Prospect',hogId:'mitch',city:'Melbourne',notes:'' });
  };

  const updateStage = (id, stage) => setDeals(deals.map(d => d.id===id ? {...d,stage} : d));

  const byStage = DEAL_STAGES.reduce((acc,s) => { acc[s]=deals.filter(d=>d.stage===s); return acc; }, {});

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:11,color:'#555',textTransform:'uppercase',letterSpacing:3}}>
          {deals.filter(d=>!['Won','Lost'].includes(d.stage)).length} active · {deals.filter(d=>d.stage==='Won').length} won · {fmt(deals.filter(d=>d.stage==='Won').reduce((s,d)=>s+d.value,0))} closed
        </div>
        <button onClick={()=>setShowForm(true)} style={{
          padding:'8px 18px',borderRadius:6,border:'none',background:'#E8C547',
          color:'#000',cursor:'pointer',fontWeight:700,fontSize:13
        }}>+ Add Deal</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
        {DEAL_STAGES.map(stage=>(
          <div key={stage} style={{background:'#0e0e0e',border:'1px solid #1a1a1a',borderRadius:10,padding:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:STAGE_COLORS[stage],flexShrink:0}}/>
              <span style={{fontSize:11,textTransform:'uppercase',letterSpacing:2,color:'#666'}}>{stage}</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#444'}}>{byStage[stage].length}</span>
            </div>
            {byStage[stage].map(d=>{
              const hog = HOGS.find(h=>h.id===d.hogId);
              return (
                <div key={d.id} style={{background:'#141414',border:'1px solid #222',borderRadius:8,padding:12,marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:4,fontFamily:"'DM Serif Display',serif",lineHeight:1.3}}>{d.name}</div>
                  <div style={{fontSize:11,color:'#555',marginBottom:8}}>{d.firm}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#E8C547',fontWeight:700}}>{fmtShort(d.value)}</span>
                    {hog && <HogAvatar hog={hog} size={22}/>}
                  </div>
                  <select value={d.stage} onChange={e=>updateStage(d.id,e.target.value)} style={{
                    marginTop:8,width:'100%',background:'#1a1a1a',border:'1px solid #2a2a2a',
                    borderRadius:4,padding:'4px 6px',color:'#aaa',fontSize:11,boxSizing:'border-box'
                  }}>
                    {DEAL_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'#000a',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#141414',border:'1px solid #2a2a2a',borderRadius:14,padding:28,width:460,maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:20,fontFamily:"'DM Serif Display',serif"}}>New Deal</div>
            {[['name','Project Name','text'],['firm','Firm','text'],['value','Fee ($)','number'],['notes','Notes','text']].map(([f,l,t])=>(
              <div key={f} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>{l}</label>
                <input type={t} value={form[f]||''} onChange={e=>setForm({...form,[f]:t==='number'?+e.target.value:e.target.value})} style={{
                  width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                  padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
                }}/>
              </div>
            ))}
            {[['stage','Stage',DEAL_STAGES],['hogId','Owner',HOGS.map(h=>h.id)],['city','City',['Melbourne','Sydney']]].map(([f,l,opts])=>(
              <div key={f} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>{l}</label>
                <select value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} style={{
                  width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                  padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
                }}>
                  {opts.map(o=><option key={o} value={o}>{f==='hogId'?HOGS.find(h=>h.id===o)?.name:o}</option>)}
                </select>
              </div>
            ))}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:6,border:'1px solid #2a2a2a',background:'transparent',color:'#666',cursor:'pointer'}}>Cancel</button>
              <button onClick={addDeal} style={{padding:'8px 18px',borderRadius:6,border:'none',background:'#E8C547',color:'#000',cursor:'pointer',fontWeight:700}}>Add Deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Daily15Tab({ daily15, setDaily15 }) {
  const [activeHog, setActiveHog] = useState('mitch');
  const tradingDays = getTradingDaysInMonth();
  const hog = HOGS.find(h => h.id === activeHog);

  const getEntry = (hogId, date) => daily15.find(e => e.hogId===hogId && e.date===date);

  const toggle = (date) => {
    const existing = getEntry(activeHog, date);
    if (existing) {
      setDaily15(daily15.filter(e => !(e.hogId===activeHog && e.date===date)));
    } else {
      const note = prompt(`Daily 15 note for ${date} (optional):`);
      setDaily15([...daily15, { hogId:activeHog, date, done:true, note:note||'', type:'', id:`d15-${activeHog}-${date}` }]);
    }
  };

  const streak = (hogId) => {
    let count = 0;
    const sorted = [...tradingDays].reverse();
    for (const d of sorted) {
      if (d > today()) continue;
      if (getEntry(hogId, d)) count++;
      else break;
    }
    return count;
  };

  const doneCount = tradingDays.filter(d => d <= today() && getEntry(activeHog, d)).length;
  const totalSoFar = tradingDays.filter(d => d <= today()).length;
  const pct = totalSoFar ? Math.round((doneCount/totalSoFar)*100) : 0;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:24}}>
        {HOGS.map(h => {
          const done = tradingDays.filter(d => d <= today() && getEntry(h.id, d)).length;
          const total = tradingDays.filter(d => d <= today()).length;
          const p = total ? Math.round((done/total)*100) : 0;
          const s = streak(h.id);
          return (
            <button key={h.id} onClick={()=>setActiveHog(h.id)} style={{
              background:activeHog===h.id?'#111':'#0a0a0a',
              border:`1.5px solid ${activeHog===h.id?h.color:'#1a1a1a'}`,
              borderRadius:10,padding:'14px 10px',cursor:'pointer',textAlign:'center',transition:'all 0.2s'
            }}>
              <HogAvatar hog={h} size={36}/>
              <div style={{fontSize:13,fontWeight:700,color:activeHog===h.id?h.color:'#fff',marginTop:8,fontFamily:"'DM Serif Display',serif"}}>{h.name}</div>
              <div style={{fontSize:20,fontWeight:700,color:h.color,marginTop:4}}>{p}%</div>
              <div style={{fontSize:10,color:'#444',marginTop:2}}>{s > 0 ? `🔥 ${s} streak` : `${done}/${total} days`}</div>
            </button>
          );
        })}
      </div>

      <div style={{background:'#111',border:`1px solid ${hog.color}33`,borderRadius:12,padding:'20px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <span style={{fontSize:16,fontWeight:700,color:'#fff',fontFamily:"'DM Serif Display',serif"}}>{hog.name} — Daily 15</span>
            <span style={{fontSize:12,color:'#555',marginLeft:12}}>{monthLabel()}</span>
          </div>
          <div style={{fontSize:13,color:hog.color,fontWeight:700}}>{doneCount}/{totalSoFar} days · {pct}%</div>
        </div>

        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {tradingDays.map(d => {
            const entry = getEntry(activeHog, d);
            const isPast = d <= today();
            const isToday = d === today();
            const dayNum = new Date(d).getDate();
            const dayName = new Date(d).toLocaleString('en-AU',{weekday:'short'});
            return (
              <div key={d} onClick={()=>isPast && toggle(d)} style={{
                width:52,textAlign:'center',cursor:isPast?'pointer':'default',
                opacity:isPast?1:0.3,
              }}>
                <div style={{fontSize:9,color:'#444',marginBottom:3,textTransform:'uppercase',letterSpacing:1}}>{dayName}</div>
                <div style={{
                  width:52,height:52,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',
                  background:entry?hog.color+'33':'#141414',
                  border:`1.5px solid ${isToday?hog.color:entry?hog.color+'66':'#1e1e1e'}`,
                  position:'relative',transition:'all 0.15s',
                  boxShadow:isToday?`0 0 0 2px ${hog.color}44`:'none'
                }}>
                  {entry
                    ? <span style={{fontSize:20}}>✓</span>
                    : <span style={{fontSize:14,color:isPast?'#444':'#222'}}>{dayNum}</span>
                  }
                </div>
                {entry?.note && (
                  <div title={entry.note} style={{
                    fontSize:8,color:'#555',marginTop:3,overflow:'hidden',
                    textOverflow:'ellipsis',whiteSpace:'nowrap',width:52
                  }}>"{entry.note.slice(0,10)}"</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{marginTop:16,fontSize:11,color:'#444'}}>
          Click any past day to log (or remove) your Daily 15. A note captures what you did.
        </div>
      </div>
    </div>
  );
}

function RoadshowsTab({ roadshows, setRoadshows }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'',date:'',city:'Melbourne',leadHog:'mitch',reps:[],venue:'',status:'Planned',attendees:0 });

  const totalNeeded = TARGETS.roadshowsPerYear;
  const completed = roadshows.filter(r=>r.status==='Completed').length;
  const planned = roadshows.filter(r=>r.status==='Planned').length;
  const nextDate = roadshows.filter(r=>r.status==='Planned' && r.date >= today()).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const daysToNext = nextDate ? Math.ceil((new Date(nextDate.date) - new Date()) / 86400000) : null;

  const addRoadshow = () => {
    setRoadshows([...roadshows, { ...form, id:`rs${Date.now()}`, followUp30:false, followUp90:false, followUp365:false }]);
    setShowForm(false);
  };

  const toggleFollowUp = (id, key) => setRoadshows(roadshows.map(r => r.id===id ? {...r,[key]:!r[key]} : r));
  const markComplete = (id) => setRoadshows(roadshows.map(r => r.id===id ? {...r,status:'Completed'} : r));

  const fyStart = new Date('2026-07-01');
  const fyEnd = new Date('2027-06-30');
  const fyDays = (fyEnd - fyStart) / 86400000;
  const elapsedDays = Math.max(0,(new Date() - fyStart)/86400000);
  const expectedByNow = Math.floor(elapsedDays / (fyDays/totalNeeded));
  const onTrack = completed >= expectedByNow;

  return (
    <div>
      <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:12,padding:'20px 24px',marginBottom:20,display:'flex',gap:32,flexWrap:'wrap',alignItems:'center'}}>
        <div>
          <div style={{fontSize:11,color:'#555',textTransform:'uppercase',letterSpacing:3,marginBottom:6}}>Roadshow Cadence</div>
          <div style={{fontSize:30,fontFamily:"'DM Serif Display',serif",color:'#fff'}}>{completed} <span style={{fontSize:14,color:'#555'}}>/ {totalNeeded}</span></div>
          <div style={{fontSize:11,color:onTrack?'#7BE87B':'#E85A5A',marginTop:4}}>{onTrack?'On track':'Behind pace'} · 1 every 2 weeks</div>
        </div>
        <div style={{flex:1,minWidth:200}}>
          <div style={{height:6,background:'#1e1e1e',borderRadius:3,overflow:'hidden',display:'flex',marginBottom:6}}>
            <div style={{width:`${(completed/totalNeeded)*100}%`,background:'#7BE87B',transition:'width 0.6s'}}/>
            <div style={{width:`${(planned/totalNeeded)*100}%`,background:'#E8C54755'}}/>
          </div>
          <div style={{fontSize:11,color:'#444',display:'flex',gap:16}}>
            <span><span style={{color:'#7BE87B'}}>■</span> {completed} completed</span>
            <span><span style={{color:'#E8C547'}}>■</span> {planned} planned</span>
            {daysToNext !== null && <span style={{marginLeft:'auto',color:'#666'}}>Next in {daysToNext}d</span>}
          </div>
        </div>
        <button onClick={()=>setShowForm(true)} style={{
          padding:'10px 20px',borderRadius:6,border:'none',background:'#E8C547',
          color:'#000',cursor:'pointer',fontWeight:700,fontSize:13,flexShrink:0
        }}>+ Book Roadshow</button>
      </div>

      <div style={{display:'grid',gap:12}}>
        {[...roadshows].sort((a,b)=>a.date.localeCompare(b.date)).map(r => {
          const lead = HOGS.find(h=>h.id===r.leadHog);
          const isPast = r.date < today();
          return (
            <div key={r.id} style={{background:'#111',border:`1px solid ${r.status==='Completed'?'#7BE87B22':'#1e1e1e'}`,borderRadius:10,padding:'16px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                    <span style={{fontSize:15,fontWeight:700,color:'#fff',fontFamily:"'DM Serif Display',serif"}}>{r.title}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:r.status==='Completed'?'#7BE87B22':'#E8C54722',color:r.status==='Completed'?'#7BE87B':'#E8C547'}}>{r.status}</span>
                    <span style={{fontSize:11,color:'#444'}}>{r.city}</span>
                  </div>
                  <div style={{fontSize:12,color:'#555',display:'flex',gap:16,flexWrap:'wrap'}}>
                    <span>{new Date(r.date).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                    {r.venue && <span>{r.venue}</span>}
                    {lead && <span>Lead: <span style={{color:lead.color}}>{lead.name}</span></span>}
                    {r.attendees > 0 && <span>{r.attendees} attendees</span>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'#444'}}>3 reps:</span>
                    {(r.reps||[]).map(rid => {
                      const rh = HOGS.find(h=>h.id===rid);
                      return rh ? <HogAvatar key={rid} hog={rh} size={24}/> : null;
                    })}
                    {(r.reps||[]).length < 3 && <span style={{fontSize:11,color:'#E85A5A'}}>⚠ Need {3-(r.reps||[]).length} more reps</span>}
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                  {r.status!=='Completed' && isPast &&
                    <button onClick={()=>markComplete(r.id)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #7BE87B44',background:'#7BE87B11',color:'#7BE87B',cursor:'pointer',fontSize:12,fontWeight:600}}>Mark Complete</button>
                  }
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[['followUp30','30d'],['followUp90','90d'],['followUp365','365d']].map(([key,lbl])=>(
                      <button key={key} onClick={()=>toggleFollowUp(r.id,key)} style={{
                        padding:'4px 10px',borderRadius:14,fontSize:11,cursor:'pointer',fontWeight:600,
                        background:r[key]?'#7BE87B22':'#1a1a1a',
                        border:`1px solid ${r[key]?'#7BE87B44':'#2a2a2a'}`,
                        color:r[key]?'#7BE87B':'#555'
                      }}>{r[key]?'✓':''} {lbl}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'#000a',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'#141414',border:'1px solid #2a2a2a',borderRadius:14,padding:28,width:480,maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:20,fontFamily:"'DM Serif Display',serif"}}>Book a Roadshow</div>
            {[['title','Title','text'],['date','Date','date'],['venue','Venue','text']].map(([f,l,t])=>(
              <div key={f} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>{l}</label>
                <input type={t} value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} style={{
                  width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                  padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
                }}/>
              </div>
            ))}
            {[['leadHog','Lead Hog',HOGS.map(h=>h.id)],['city','City',['Melbourne','Sydney']],['status','Status',['Planned','Completed']]].map(([f,l,opts])=>(
              <div key={f} style={{marginBottom:14}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>{l}</label>
                <select value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} style={{
                  width:'100%',background:'#1e1e1e',border:'1px solid #2a2a2a',borderRadius:6,
                  padding:'8px 12px',color:'#fff',fontSize:14,boxSizing:'border-box'
                }}>
                  {opts.map(o=><option key={o} value={o}>{f==='leadHog'?HOGS.find(h=>h.id===o)?.name:o}</option>)}
                </select>
              </div>
            ))}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:2}}>Reps in the Room (min 3)</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {HOGS.map(h=>(
                  <button key={h.id} onClick={()=>{
                    const reps = form.reps||[];
                    setForm({...form, reps: reps.includes(h.id)?reps.filter(r=>r!==h.id):[...reps,h.id]});
                  }} style={{
                    padding:'6px 14px',borderRadius:20,border:`1.5px solid ${(form.reps||[]).includes(h.id)?h.color:'#2a2a2a'}`,
                    background:(form.reps||[]).includes(h.id)?h.color+'22':'transparent',
                    color:(form.reps||[]).includes(h.id)?h.color:'#555',cursor:'pointer',fontSize:12,fontWeight:600
                  }}>{h.name}</button>
                ))}
              </div>
              {(form.reps||[]).length < 3 && <div style={{fontSize:11,color:'#E85A5A',marginTop:6}}>Select at least 3 reps</div>}
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>setShowForm(false)} style={{padding:'8px 18px',borderRadius:6,border:'1px solid #2a2a2a',background:'transparent',color:'#666',cursor:'pointer'}}>Cancel</button>
              <button onClick={addRoadshow} disabled={(form.reps||[]).length<3} style={{padding:'8px 18px',borderRadius:6,border:'none',background:(form.reps||[]).length>=3?'#E8C547':'#333',color:(form.reps||[]).length>=3?'#000':'#555',cursor:(form.reps||[]).length>=3?'pointer':'not-allowed',fontWeight:700}}>Book It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesHogsCRM() {
  const [tab, setTab] = useState('pipeline');
  const [goNetwork, setGoNetworkRaw] = useState(null);
  const [deals, setDealsRaw] = useState(null);
  const [daily15, setDaily15Raw] = useState(null);
  const [roadshows, setRoadshowsRaw] = useState(null);
  const [activeHog, setActiveHog] = useState('mitch');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGoNetworkRaw(store.get('sh-go') || seedGoNetwork());
    setDealsRaw(store.get('sh-deals') || seedDeals());
    setDaily15Raw(store.get('sh-d15') || []);
    setRoadshowsRaw(store.get('sh-rs') || seedRoadshows());
    setLoaded(true);
  }, []);

  const setGoNetwork = useCallback(v => { setGoNetworkRaw(v); store.set('sh-go', v); }, []);
  const setDeals = useCallback(v => { setDealsRaw(v); store.set('sh-deals', v); }, []);
  const setDaily15 = useCallback(v => { setDaily15Raw(v); store.set('sh-d15', v); }, []);
  const setRoadshows = useCallback(v => { setRoadshowsRaw(v); store.set('sh-rs', v); }, []);

  if (!loaded) return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontSize:13,color:'#444',letterSpacing:4,textTransform:'uppercase'}}>Loading Sales Hogs…</div>
    </div>
  );

  const TABS = [
    { id:'pipeline', label:'Pipeline' },
    { id:'go', label:'Go Network' },
    { id:'deals', label:'Deals' },
    { id:'d15', label:'Daily 15' },
    { id:'roadshows', label:'Roadshows' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',fontFamily:"'Sora',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Sora:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; background:#0a0a0a; }
        ::-webkit-scrollbar-thumb { background:#222; border-radius:2px; }
        select option { background:#1e1e1e; }
      `}</style>

      <div style={{borderBottom:'1px solid #1a1a1a',padding:'0 32px',display:'flex',alignItems:'center',gap:0,background:'#080808'}}>
        <div style={{padding:'18px 0',marginRight:40,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:8,height:8,background:'#E8C547',borderRadius:'50%'}}/>
          <span style={{fontSize:13,fontWeight:700,letterSpacing:3,textTransform:'uppercase',color:'#fff'}}>Made For</span>
          <span style={{fontSize:11,color:'#333',letterSpacing:2,textTransform:'uppercase',paddingLeft:12,borderLeft:'1px solid #222'}}>Sales Hogs</span>
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'18px 18px',background:'none',border:'none',
            borderBottom:`2px solid ${tab===t.id?'#E8C547':'transparent'}`,
            color:tab===t.id?'#E8C547':'#555',cursor:'pointer',fontSize:12,fontWeight:600,
            letterSpacing:1,textTransform:'uppercase',transition:'all 0.15s',whiteSpace:'nowrap'
          }}>{t.label}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:6,paddingLeft:24}}>
          {HOGS.map(h=><HogAvatar key={h.id} hog={h} size={28}/>)}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 32px'}}>
        {tab === 'pipeline' && (
          <>
            <PipelineBar deals={deals||[]}/>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:24}}>
              {HOGS.map(h => {
                const hDeals = (deals||[]).filter(d=>d.hogId===h.id);
                const won = hDeals.filter(d=>d.stage==='Won').reduce((s,d)=>s+d.value,0);
                const active = hDeals.filter(d=>!['Won','Lost'].includes(d.stage)).length;
                const goOpps = (goNetwork||[]).filter(c=>c.hogId===h.id).reduce((s,c)=>s+(c.opps||0),0);
                const d15Done = (daily15||[]).filter(e=>e.hogId===h.id).length;
                return (
                  <div key={h.id} style={{background:'#0e0e0e',border:`1px solid ${h.color}22`,borderRadius:10,padding:'14px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <HogAvatar hog={h} size={28}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#fff',fontFamily:"'DM Serif Display',serif"}}>{h.name}</div>
                        <div style={{fontSize:10,color:'#555'}}>{h.city}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      {[
                        {l:'Won',v:fmtShort(won),c:'#7BE87B'},
                        {l:'Active',v:active,c:'#E8C547'},
                        {l:'GO Opps',v:goOpps,c:'#C47BE8'},
                        {l:'D15 Days',v:d15Done,c:'#5EC4B6'},
                      ].map(m=>(
                        <div key={m.l} style={{background:'#141414',borderRadius:6,padding:'8px 10px'}}>
                          <div style={{fontSize:16,fontWeight:700,color:m.c,fontFamily:"'DM Serif Display',serif"}}>{m.v}</div>
                          <div style={{fontSize:9,color:'#444',textTransform:'uppercase',letterSpacing:2,marginTop:2}}>{m.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{background:'#0e0e0e',border:'1px solid #1a1a1a',borderRadius:10,padding:'14px 20px',display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:11,color:'#555',textTransform:'uppercase',letterSpacing:3}}>Roadshow</span>
              <span style={{fontSize:20,fontFamily:"'DM Serif Display',serif",color:'#fff'}}>
                {(roadshows||[]).filter(r=>r.status==='Completed').length}
                <span style={{fontSize:12,color:'#444'}}> / {TARGETS.roadshowsPerYear}</span>
              </span>
              <span style={{fontSize:12,color:'#444'}}>Next booked: {
                (roadshows||[]).filter(r=>r.status==='Planned'&&r.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0]?.date
                ? new Date((roadshows||[]).filter(r=>r.status==='Planned'&&r.date>=today()).sort((a,b)=>a.date.localeCompare(b.date))[0].date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})
                : 'None booked'
              }</span>
              <span style={{marginLeft:'auto',fontSize:11,color:'#333'}}>Target: 1 every 2 weeks · {TARGETS.roadshowsPerYear} per FY</span>
            </div>
          </>
        )}
        {tab === 'go' && <GoNetworkTab goNetwork={goNetwork||[]} setGoNetwork={setGoNetwork} activeHog={activeHog} setActiveHog={setActiveHog}/>}
        {tab === 'deals' && <DealsTab deals={deals||[]} setDeals={setDeals}/>}
        {tab === 'd15' && <Daily15Tab daily15={daily15||[]} setDaily15={setDaily15}/>}
        {tab === 'roadshows' && <RoadshowsTab roadshows={roadshows||[]} setRoadshows={setRoadshows}/>}
      </div>
    </div>
  );
}
