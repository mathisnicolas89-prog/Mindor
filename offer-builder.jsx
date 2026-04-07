import { useState, useEffect, useRef, useCallback } from "react";

async function store(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} }
async function load(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function remove(key) { try { await window.storage.delete(key); } catch {} }
async function listKeys(prefix) { try { const r = await window.storage.list(prefix); return r?.keys || []; } catch { return []; } }
function hashPw(pw) { let h = 0; for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0; return "h_" + Math.abs(h).toString(36); }

const ADMIN_EMAIL = "admin@mindoroffer.io";
const ADMIN_PW = "admin2025";
const MODULES = [
  { icon: "👤", title: "Ton Profil", sub: "Compétences & contexte" },
  { icon: "🎯", title: "Client Idéal", sub: "Recherche profonde" },
  { icon: "💎", title: "Promesse", sub: "Ta proposition unique" },
  { icon: "⚙️", title: "Mécanisme", sub: "Ta méthode signature" },
  { icon: "📦", title: "Offre", sub: "Structure complète" },
  { icon: "💰", title: "Pricing", sub: "Prix & valeur perçue" },
  { icon: "📊", title: "Simulateur", sub: "Résultats concrets" },
  { icon: "✅", title: "Validation", sub: "Analyse & score" },
  { icon: "🚀", title: "Résultat Final", sub: "Offre prête à vendre" },
];

const Btn = ({ children, onClick, variant = "primary", disabled, style }) => (
  <button className={`btn btn-${variant}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>
);
const TA = ({ value, onChange, placeholder, rows = 3 }) => (
  <textarea className="inp" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
);
const Inp = ({ value, onChange, placeholder, type = "text" }) => (
  <input className="inp" type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
);
const Sel = ({ value, onChange, options, placeholder }) => (
  <select className="inp" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Ring = ({ value }) => {
  const r = 22, c = 2 * Math.PI * r, p = ((100 - value) / 100) * c;
  return (<svg width="50" height="50" viewBox="0 0 56 56"><circle cx="28" cy="28" r={r} fill="none" stroke="#1a1a2e" strokeWidth="4" /><circle cx="28" cy="28" r={r} fill="none" stroke="#f0c040" strokeWidth="4" strokeDasharray={c} strokeDashoffset={p} strokeLinecap="round" transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset .5s" }} /><text x="28" y="32" textAnchor="middle" fill="#f0c040" fontSize="13" fontWeight="700">{Math.round(value)}%</text></svg>);
};
const Spin = ({ text = "L'IA analyse..." }) => (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 0" }}><div className="spinner" /><p style={{ color: "#a0a0c0", marginTop: 12 }}>{text}</p></div>);

async function askAI(sys, msg) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: sys, messages: [{ role: "user", content: msg }] }) });
    const d = await r.json(); return d.content?.map(b => b.text || "").join("\n") || "";
  } catch { return "Erreur de connexion. Réessaie."; }
}

// ── AUTH ──
function Auth({ onAuth, onAdmin }) {
  const [mode, setMode] = useState("login");
  const [fm, setFm] = useState({ fn: "", ln: "", em: "", pw: "", pw2: "" });
  const [err, setErr] = useState("");
  const [ld, setLd] = useState(false);
  const f = (k, v) => setFm({ ...fm, [k]: v });

  const signup = async () => {
    setErr("");
    if (!fm.fn.trim() || !fm.ln.trim() || !fm.em.trim() || !fm.pw) return setErr("Tous les champs sont obligatoires.");
    if (fm.pw.length < 6) return setErr("Mot de passe : 6 caractères minimum.");
    if (fm.pw !== fm.pw2) return setErr("Mots de passe différents.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fm.em)) return setErr("Email invalide.");
    setLd(true);
    const k = "user:" + fm.em.toLowerCase().trim();
    if (await load(k)) { setLd(false); return setErr("Compte existant."); }
    await store(k, { firstName: fm.fn.trim(), lastName: fm.ln.trim(), email: fm.em.toLowerCase().trim(), pwHash: hashPw(fm.pw), status: "pending", createdAt: new Date().toISOString(), moduleData: Array(9).fill(null).map(() => ({})), aiResults: Array(7).fill(""), currentStep: 0 });
    setLd(false); setMode("pending");
  };

  const login = async () => {
    setErr("");
    if (!fm.em.trim() || !fm.pw) return setErr("Champs requis.");
    if (fm.em.toLowerCase().trim() === ADMIN_EMAIL && fm.pw === ADMIN_PW) return onAdmin();
    setLd(true);
    const u = await load("user:" + fm.em.toLowerCase().trim());
    setLd(false);
    if (!u) return setErr("Aucun compte trouvé.");
    if (u.pwHash !== hashPw(fm.pw)) return setErr("Mot de passe incorrect.");
    if (u.status === "pending") return setMode("pending");
    if (u.status === "rejected") return setErr("Accès refusé par l'administrateur.");
    if (u.status === "disabled") return setErr("Compte désactivé.");
    onAuth(u);
  };

  if (mode === "pending") return (
    <div className="auth-bg"><div className="auth-card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
      <h2 className="gold-title" style={{ fontSize: 20 }}>Compte en attente</h2>
      <p className="sub">Votre compte a bien été créé. Il est actuellement <strong style={{ color: "#f0c040" }}>en attente de validation</strong> par l'administrateur.</p>
      <div className="pend-box">🔒 Accès verrouillé — Validation requise</div>
      <Btn variant="ghost" onClick={() => { setMode("login"); setErr(""); }} style={{ marginTop: 20, width: "100%" }}>← Retour connexion</Btn>
    </div></div>
  );

  return (
    <div className="auth-bg"><div className="auth-card">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 className="gold-title" style={{ fontSize: 28 }}>Mindor Offer</h1>
        <p style={{ fontSize: 10, letterSpacing: 2.5, color: "#606090" }}>CRÉATEUR D'OFFRES IRRÉSISTIBLES</p>
      </div>
      <div className="tabs">
        <button className={`tab ${mode === "login" ? "on" : ""}`} onClick={() => { setMode("login"); setErr(""); }}>Connexion</button>
        <button className={`tab ${mode === "signup" ? "on" : ""}`} onClick={() => { setMode("signup"); setErr(""); }}>Inscription</button>
      </div>
      {mode === "signup" && <>
        <div className="r2"><div style={{ flex: 1 }}><label className="fl">Prénom *</label><Inp value={fm.fn} onChange={v => f("fn", v)} placeholder="Jean" /></div><div style={{ flex: 1 }}><label className="fl">Nom *</label><Inp value={fm.ln} onChange={v => f("ln", v)} placeholder="Dupont" /></div></div>
        <label className="fl">Email *</label><Inp value={fm.em} onChange={v => f("em", v)} placeholder="jean@exemple.com" type="email" />
        <label className="fl">Mot de passe * (min. 6)</label><Inp value={fm.pw} onChange={v => f("pw", v)} placeholder="••••••••" type="password" />
        <label className="fl">Confirmer *</label><Inp value={fm.pw2} onChange={v => f("pw2", v)} placeholder="••••••••" type="password" />
      </>}
      {mode === "login" && <>
        <label className="fl">Email</label><Inp value={fm.em} onChange={v => f("em", v)} placeholder="votre@email.com" type="email" />
        <label className="fl">Mot de passe</label><Inp value={fm.pw} onChange={v => f("pw", v)} placeholder="••••••••" type="password" />
      </>}
      {err && <div className="err-box">{err}</div>}
      <Btn onClick={mode === "signup" ? signup : login} disabled={ld} style={{ width: "100%", marginTop: 18 }}>{ld ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}</Btn>
      {mode === "login" && <p style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#404060" }}>Admin : {ADMIN_EMAIL} / {ADMIN_PW}</p>}
    </div></div>
  );
}

// ── ADMIN ──
function Admin({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [ld, setLd] = useState(true);
  const [fil, setFil] = useState("all");

  const reload = async () => {
    setLd(true);
    const keys = await listKeys("user:");
    const list = [];
    for (const k of keys) { const u = await load(k); if (u) list.push({ ...u, _k: k }); }
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setUsers(list); setLd(false);
  };
  useEffect(() => { reload(); }, []);
  const act = async (u, s) => { u.status = s; await store(u._k, u); reload(); };
  const del = async (u) => { await remove(u._k); reload(); };
  const cnt = s => s === "all" ? users.length : users.filter(u => u.status === s).length;
  const shown = fil === "all" ? users : users.filter(u => u.status === fil);
  const badge = s => { const m = { pending: ["⏳", "#f0c040"], approved: ["✅", "#4ade80"], rejected: ["❌", "#f87171"], disabled: ["🚫", "#888"] }; const [i, c] = m[s] || ["?", "#aaa"]; return <span style={{ color: c, fontSize: 12 }}>{i} {s}</span>; };

  return (
    <div className="adm">
      <div className="adm-top"><div><h1 className="gold-title" style={{ fontSize: 22 }}>🛡️ Panneau Admin</h1><p className="sub" style={{ fontSize: 12 }}>Gestion des accès — Mindor Offer</p></div><Btn variant="ghost" onClick={onLogout}>Déconnexion</Btn></div>
      <div className="stats">
        {[["all", "Tous"], ["pending", "En attente"], ["approved", "Approuvés"], ["rejected", "Refusés"], ["disabled", "Désactivés"]].map(([k, l]) => (
          <button key={k} className={`scard ${fil === k ? "on" : ""}`} onClick={() => setFil(k)}><span className="snum">{cnt(k)}</span><span className="slbl">{l}</span></button>
        ))}
      </div>
      {ld ? <Spin text="Chargement..." /> : shown.length === 0 ? <p style={{ textAlign: "center", color: "#505070", padding: 40 }}>Aucun utilisateur.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table className="tbl"><thead><tr><th>Utilisateur</th><th>Email</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{shown.map((u, i) => (
              <tr key={i}>
                <td style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="av">{u.firstName?.[0]}{u.lastName?.[0]}</div>{u.firstName} {u.lastName}</td>
                <td>{u.email}</td><td>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td><td>{badge(u.status)}</td>
                <td className="acts">
                  {u.status !== "approved" && <button className="ab ap" onClick={() => act(u, "approved")}>✓</button>}
                  {u.status !== "rejected" && u.status !== "disabled" && <button className="ab rj" onClick={() => act(u, "rejected")}>✗</button>}
                  {u.status === "approved" && <button className="ab ds" onClick={() => act(u, "disabled")}>⏸</button>}
                  <button className="ab dl" onClick={() => del(u)}>🗑</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── MODULES ──
function Mod0({ d, set }) {
  const f = (k, v) => set({ ...d, [k]: v });
  return (<div className="mc"><h2 className="gold-title">Dis-moi tout sur toi</h2><p className="sub">On va trouver ton angle unique à partir de ce que tu sais déjà.</p>
    <label className="fl">Tes compétences</label><TA value={d.skills||""} onChange={v=>f("skills",v)} placeholder="Ex : cuisiner, écrire, Canva..." rows={2} />
    <label className="fl">Ton vécu</label><TA value={d.exp||""} onChange={v=>f("exp",v)} placeholder="Ex : burnout surmonté, voyage..." rows={2} />
    <label className="fl">Ce que tu adores</label><TA value={d.loves||""} onChange={v=>f("loves",v)} placeholder="Ex : aider les gens, créer..." rows={2} />
    <label className="fl">Ce que tu détestes</label><TA value={d.hates||""} onChange={v=>f("hates",v)} placeholder="Ex : prospection, technique..." rows={2} />
    <div className="r2"><div style={{flex:1}}><label className="fl">Objectif / mois</label><Sel value={d.goal||""} onChange={v=>f("goal",v)} options={["500 €","1 000 €","2 000 €","5 000 €","10 000 €+"]} placeholder="—" /></div><div style={{flex:1}}><label className="fl">Temps / semaine</label><Sel value={d.time||""} onChange={v=>f("time",v)} options={["< 5h","5-10h","10-20h","20-35h","35h+"]} placeholder="—" /></div></div>
    <label className="fl">Tes blocages</label><TA value={d.blocks||""} onChange={v=>f("blocks",v)} placeholder="Ex : peur de vendre, imposteur..." rows={2} />
  </div>);
}
function Mod1({ d, set }) {
  const f = (k, v) => set({ ...d, [k]: v });
  return (<div className="mc"><h2 className="gold-title">Ton Client Idéal</h2><p className="sub">Plus tu le connais, plus ton offre sera magnétique.</p>
    <label className="fl">Qui est-il ?</label><TA value={d.who||""} onChange={v=>f("who",v)} placeholder="Ex : femme 30-40, salariée..." rows={2} />
    <label className="fl">Ses douleurs</label><TA value={d.pains||""} onChange={v=>f("pains",v)} placeholder="Ex : manque de temps..." rows={2} />
    <label className="fl">Ses désirs</label><TA value={d.desires||""} onChange={v=>f("desires",v)} placeholder="Ex : liberté financière..." rows={2} />
    <label className="fl">Ses peurs</label><TA value={d.fears||""} onChange={v=>f("fears",v)} placeholder="Ex : 'ça marchera pas'..." rows={2} />
    <label className="fl">Déjà essayé</label><TA value={d.tried||""} onChange={v=>f("tried",v)} placeholder="Ex : formations, coachs..." rows={2} />
    <label className="fl">Réseaux</label><TA value={d.inf||""} onChange={v=>f("inf",v)} placeholder="Ex : influenceurs lifestyle..." rows={2} />
  </div>);
}

function AIMod({ title, desc, prompt, ctx, result, setResult }) {
  const [ld, setLd] = useState(false);
  const gen = async () => { setLd(true); setResult(await askAI(prompt, ctx())); setLd(false); };
  return (<div className="mc"><h2 className="gold-title">{title}</h2><p className="sub">{desc}</p>
    {ld ? <Spin /> : result ? (<div className="ai-box"><pre className="ai-txt">{result}</pre><Btn variant="ghost" onClick={gen} style={{ marginTop: 12 }}>🔄 Régénérer</Btn></div>) : (<div style={{ textAlign: "center", padding: "40px 0" }}><Btn onClick={gen}>✨ Générer avec l'IA</Btn></div>)}
  </div>);
}

function bCtx(d) {
  return `PROFIL: ${d[0]?.skills||"?"}, vécu=${d[0]?.exp||"?"}, aime=${d[0]?.loves||"?"}, déteste=${d[0]?.hates||"?"}, objectif=${d[0]?.goal||"?"}, temps=${d[0]?.time||"?"}, blocages=${d[0]?.blocks||"?"}
CLIENT: ${d[1]?.who||"?"}, douleurs=${d[1]?.pains||"?"}, désirs=${d[1]?.desires||"?"}, peurs=${d[1]?.fears||"?"}, essayé=${d[1]?.tried||"?"}, réseaux=${d[1]?.inf||"?"}`;
}

const AIS = [
  { t: "Ta Promesse Irrésistible", d: "4 promesses notées par l'IA.", p: `Expert copywriting. 4 promesses "J'aide [personne] à [résultat] en [durée] grâce à [mécanisme]". Note /10. Français, emojis, concret.` },
  { t: "Ton Mécanisme Unique", d: "Méthode signature en 3-5 étapes.", p: `Stratège business. Mécanisme: Nom, 3-5 étapes, 2 variantes. Français.` },
  { t: "Structure de ton Offre", d: "Format, livrables, bonus, support.", p: `Architecte offres. Format, Durée, Livrables, Bonus, Support. Simple. Français.` },
  { t: "Pricing & Valeur Perçue", d: "Prix basé sur la transformation.", p: `Expert pricing. Ancrage, Avant/après, Justification, 2-3 options. Français.` },
  { t: "Simulateur de Résultats", d: "Résultats concrets.", p: `Expert ROI. Gains, Temps, Impact vie. Chiffres réalistes. Français.` },
  { t: "Validation de l'Offre", d: "Analyse & note /100.", p: `Consultant. Note /100, critères /20, forces, améliorations, version optimisée. Français.` },
  { t: "Offre Finale Prête à Vendre", d: "Package complet.", p: `Expert lancement. 1)🎯PROMESSE 2)📌POSITIONNEMENT 3)📦OFFRE 4)🎤PITCH 30s 5)✍️TEXTE DE VENTE. Français.` },
];

// ── BUILDER ──
function Builder({ user, onLogout }) {
  const [step, setStep] = useState(user.currentStep || 0);
  const [md, setMd] = useState(user.moduleData || Array(9).fill(null).map(() => ({})));
  const [ar, setAr] = useState(user.aiResults || Array(7).fill(""));
  const [sav, setSav] = useState(false);
  const ref = useRef(null);

  const save = useCallback(async () => {
    setSav(true);
    const u = await load("user:" + user.email);
    if (u) { u.moduleData = md; u.aiResults = ar; u.currentStep = step; await store("user:" + user.email, u); }
    setSav(false);
  }, [md, ar, step, user.email]);

  useEffect(() => { const t = setTimeout(save, 2000); return () => clearTimeout(t); }, [md, ar, step]);
  useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const sMD = i => d => { const c = [...md]; c[i] = d; setMd(c); };
  const sAR = i => r => { const c = [...ar]; c[i] = r; setAr(c); };
  const prog = ((step + 1) / 9) * 100;
  const ok = () => { if (step === 0) return !!(md[0]?.skills && md[0]?.goal); if (step === 1) return !!(md[1]?.who && md[1]?.pains); return true; };

  const render = () => {
    if (step === 0) return <Mod0 d={md[0]} set={sMD(0)} />;
    if (step === 1) return <Mod1 d={md[1]} set={sMD(1)} />;
    const i = step - 2, m = AIS[i];
    return <AIMod title={m.t} desc={m.d} prompt={m.p} ctx={() => bCtx(md) + (i > 0 ? "\nPRÉC:\n" + ar.slice(0, i).filter(Boolean).join("\n---\n") : "")} result={ar[i]} setResult={sAR(i)} />;
  };

  return (
    <div className="bld">
      <aside className="side">
        <div className="sbrand"><h1 className="gold-title" style={{ fontSize: 20 }}>Mindor Offer</h1><p style={{ fontSize: 9, color: "#606090", letterSpacing: 2 }}>CRÉATEUR D'OFFRES</p></div>
        <div className="suser"><div className="av">{user.firstName?.[0]}{user.lastName?.[0]}</div><div><div style={{ fontSize: 13, fontWeight: 600 }}>{user.firstName}</div><button className="lo" onClick={async () => { await save(); onLogout(); }}>Déconnexion</button></div></div>
        <div className="snav">
          {MODULES.map((m, i) => (
            <div key={i} className={`ni ${step === i ? "on" : ""} ${i < step ? "dn" : ""}`} onClick={() => i <= step && setStep(i)}>
              <div className="nic">{i < step ? "✓" : m.icon}</div>
              <div><div className="nit">{m.title}</div><div className="nis">{m.sub}</div></div>
            </div>
          ))}
        </div>
      </aside>
      <main className="mn">
        <div className="topb"><span style={{ fontSize: 13, color: "#808098" }}>Module {step + 1}/9 {sav && <span className="pls">💾</span>}</span><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div className="pgbg"><div className="pgfill" style={{ width: `${prog}%` }} /></div><Ring value={prog} /></div></div>
        <div className="scroll" ref={ref}>{render()}</div>
        <div className="botnav"><Btn variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>← Précédent</Btn><Btn onClick={() => setStep(step + 1)} disabled={step === 8 || !ok()}>{step === 7 ? "Résultat →" : "Suivant →"}</Btn></div>
      </main>
    </div>
  );
}

export default function App() {
  const [v, setV] = useState("auth");
  const [u, setU] = useState(null);
  return (
    <div className="root">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=Playfair+Display:wght@700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.root{font-family:'DM Sans',sans-serif;background:#0b0b1a;color:#e0e0f0;height:100vh;overflow:hidden}
.gold-title{font-family:'Playfair Display',serif;font-weight:800;background:linear-gradient(135deg,#f0c040,#e8a020);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.sub{color:#808098;font-size:14px;line-height:1.6;margin-bottom:24px}
.fl{display:block;font-size:12px;font-weight:500;color:#a0a0c0;margin:14px 0 5px}
.inp{width:100%;background:#12122a;border:1px solid #252548;border-radius:10px;padding:10px 13px;color:#e0e0f0;font-size:13.5px;font-family:'DM Sans',sans-serif;resize:vertical;transition:border-color .2s;outline:none}
.inp:focus{border-color:#f0c040}.inp::placeholder{color:#404060}
select.inp{cursor:pointer}
.r2{display:flex;gap:12px}
.btn{padding:10px 22px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:.2s}
.btn:disabled{opacity:.3;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,#f0c040,#e8a020);color:#0b0b1a}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 16px rgba(240,192,64,.2)}
.btn-secondary{background:#1a1a3e;color:#c0c0d0}.btn-secondary:hover{background:#252548}
.btn-ghost{background:transparent;color:#f0c040;border:1px solid #f0c04040;padding:7px 14px;font-size:12px}.btn-ghost:hover{background:#f0c04010}
.spinner{width:32px;height:32px;border:3px solid #1a1a3e;border-top-color:#f0c040;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.pls{animation:pl 1s ease infinite}
@keyframes pl{0%,100%{opacity:.3}50%{opacity:1}}

/* AUTH */
.auth-bg{height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 30% 20%,#14143a,#0b0b1a 70%);padding:16px}
.auth-card{background:#10102a;border:1px solid #1e1e44;border-radius:18px;padding:36px 32px;max-width:420px;width:100%;animation:fu .4s ease}
@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.tabs{display:flex;gap:3px;margin-bottom:22px;background:#0b0b1a;border-radius:9px;padding:3px}
.tab{flex:1;padding:9px;background:none;border:none;color:#606090;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:600;border-radius:7px;cursor:pointer;transition:.2s}
.tab.on{background:#1a1a3e;color:#f0c040}
.err-box{background:#f8717115;border:1px solid #f8717125;color:#f87171;border-radius:9px;padding:9px 12px;font-size:12.5px;margin-top:10px}
.pend-box{background:#f0c04010;border:1px solid #f0c04025;color:#f0c040;border-radius:10px;padding:11px;font-size:13px;font-weight:600;margin-top:18px}

/* ADMIN */
.adm{height:100%;overflow-y:auto;padding:28px}
.adm-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:10px}
.stats{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.scard{background:#10102a;border:1px solid #1e1e44;border-radius:10px;padding:12px 16px;cursor:pointer;transition:.2s;text-align:center;min-width:80px;flex:1;font-family:'DM Sans',sans-serif}
.scard:hover,.scard.on{border-color:#f0c04050;background:#14142e}
.snum{display:block;font-size:20px;font-weight:700;color:#f0c040}
.slbl{display:block;font-size:9px;color:#808098;text-transform:uppercase;letter-spacing:1px;margin-top:1px}
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#606090;border-bottom:1px solid #1e1e44}
.tbl td{padding:10px 12px;border-bottom:1px solid #12122a;font-size:12.5px;color:#c0c0d0}
.tbl tr:hover td{background:#0e0e24}
.av{width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#f0c040,#e8a020);color:#0b0b1a;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
.acts{display:flex;gap:4px;flex-wrap:wrap}
.ab{padding:4px 8px;border-radius:5px;border:1px solid #252548;background:#12122a;color:#c0c0d0;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif}
.ab:hover{background:#1a1a3e}
.ab.ap{color:#4ade80;border-color:#4ade8030}.ab.rj{color:#f87171;border-color:#f8717130}.ab.ds{color:#fbbf24;border-color:#fbbf2430}.ab.dl{color:#f87171;border-color:#f8717130}

/* BUILDER */
.bld{display:flex;height:100%}
.side{width:250px;min-width:250px;background:linear-gradient(180deg,#10102a,#0d0d20);border-right:1px solid #1a1a3e;display:flex;flex-direction:column;overflow-y:auto}
.sbrand{padding:20px 20px 14px}
.suser{display:flex;align-items:center;gap:9px;padding:9px 20px;border-top:1px solid #1a1a3e;border-bottom:1px solid #1a1a3e;margin-bottom:4px}
.lo{background:none;border:none;color:#606090;font-size:10px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:0}.lo:hover{color:#f0c040}
.snav{flex:1;padding:2px 0}
.ni{display:flex;align-items:center;gap:10px;padding:7px 20px;cursor:pointer;transition:.2s;border-left:3px solid transparent;font-size:12px}
.ni:hover{background:#14142e}
.ni.on{background:linear-gradient(90deg,rgba(240,192,64,.08),transparent);border-left-color:#f0c040}
.ni.on .nit{color:#f0c040}
.ni.dn .nic{background:#1a3a1a;color:#4ade80}
.nic{width:26px;height:26px;border-radius:6px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.nit{font-weight:500;color:#c0c0d0;font-size:12px}
.nis{font-size:10px;color:#505070}
.mn{flex:1;display:flex;flex-direction:column;min-width:0}
.topb{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid #1a1a3e;flex-shrink:0}
.pgbg{width:140px;height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden}
.pgfill{height:100%;border-radius:2px;background:linear-gradient(90deg,#f0c040,#e8a020);transition:width .4s}
.scroll{flex:1;overflow-y:auto;padding:28px 32px}
.scroll::-webkit-scrollbar{width:4px}.scroll::-webkit-scrollbar-thumb{background:#2a2a4e;border-radius:2px}
.mc{max-width:640px;margin:0 auto}
.botnav{padding:14px 32px;display:flex;justify-content:space-between;border-top:1px solid #1a1a3e;flex-shrink:0}
.ai-box{background:#12122a;border:1px solid #252548;border-radius:12px;padding:20px}
.ai-txt{white-space:pre-wrap;font-family:'DM Sans',sans-serif;font-size:13px;line-height:1.8;color:#d0d0e8}

@media(max-width:800px){.side{display:none}.scroll{padding:16px}.botnav{padding:12px}.r2{flex-direction:column;gap:0}.adm{padding:14px}.stats{gap:5px}}
      `}</style>
      {v === "auth" && <Auth onAuth={u => { setU(u); setV("app"); }} onAdmin={() => setV("admin")} />}
      {v === "admin" && <Admin onLogout={() => setV("auth")} />}
      {v === "app" && u && <Builder user={u} onLogout={() => { setU(null); setV("auth"); }} />}
    </div>
  );
}
