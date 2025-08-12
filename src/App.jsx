import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ==========================
// PAINEL DE CONQUISTAS – MVP
// ==========================
// • Login simples por e-mail (mock) – salva em localStorage
// • Quiz "Programador Decisivo" (10 questões)
// • Nota de corte: 80%
// • Ao passar: grava conquista + gera selo personalizado via <canvas>
// • Download do selo (PNG)
// • UI com Tailwind + Framer Motion

// ————— Helpers —————
const LS_USER_KEY = "pcm_user_email";
const LS_BADGES_KEY = "pcm_user_badges"; // [{ code: "PROGRAMADOR_DECISIVO", name, imageDataUrl, earnedAt }]

function classNames(...arr){
  return arr.filter(Boolean).join(" ");
}

function saveUser(email){
  localStorage.setItem(LS_USER_KEY, email);
}
function getUser(){
  return localStorage.getItem(LS_USER_KEY);
}
function loadBadges(){
  try{ return JSON.parse(localStorage.getItem(LS_BADGES_KEY) || "[]"); }catch{ return []; }
}
function saveBadges(badges){
  localStorage.setItem(LS_BADGES_KEY, JSON.stringify(badges));
}

// ————— Badge Base (SVG) —————
// SVG base do selo (neon + aço) gerado em runtime e rasterizado no canvas
function getBadgeBaseSVG(title="PROGRAMADOR DECISIVO"){
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g1" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#0ff" stop-opacity="0.25"/>
        <stop offset="70%" stop-color="#0af" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#00111a" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9aa3ad"/>
        <stop offset="50%" stop-color="#333b44"/>
        <stop offset="100%" stop-color="#c7d0da"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="b"/>
        <feMerge>
          <feMergeNode in="b"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="1024" height="1024" fill="url(#g1)"/>

    <g transform="translate(64,64)">
      <circle cx="448" cy="448" r="448" fill="#0a0f14" stroke="#0ff" stroke-opacity="0.25" stroke-width="2"/>
      <circle cx="448" cy="448" r="420" fill="url(#metal)" opacity="0.18"/>
      <circle cx="448" cy="448" r="380" fill="#0b1520" stroke="#0cf" stroke-opacity="0.35" stroke-width="4"/>

      <!-- micro circuit background -->
      <g opacity="0.25" stroke="#12b4ff" stroke-width="1">
        ${Array.from({length: 60}).map((_,i)=>{
          const x = 120 + (i*11)%640; const y = 160 + (i*19)%560; const w = 40 + (i%5)*20; const h = 10 + (i%3)*12;
          return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none"/>`;
        }).join("")}
      </g>

      <!-- Python + Knight (simplificados) -->
      <g transform="translate(288,240)" filter="url(#glow)">
        <path d="M130 0h120c40 0 70 30 70 70v80c0 30-25 55-55 55H190c-33 0-60 27-60 60v40c0 40-30 70-70 70H-60c-40 0-70-30-70-70v-90c0-33 27-60 60-60H-10c33 0 60-27 60-60V70C50 30 80 0 120 0Z" fill="#0df" opacity="0.85"/>
        <circle cx="155" cy="45" r="12" fill="#00111a"/>
        <path d="M240 120c60 0 110 40 110 110s-40 110-110 110c-15 0-30-3-45-9 20-25 35-60 35-100 0-45-18-83-45-108 15-2 30-3 45-3Z" fill="#0cf"/>
        <!-- Knight silhouette -->
        <path d="M190 165c35-30 85-20 105 5 18 21 18 50-2 69-13 13-31 19-49 19l-10 24c-3 7-10 11-17 11h-38c-7 0-12-6-11-13l6-35c-16-10-24-25-24-44 0-16 7-28 19-36l21-13Z" fill="#061b2a" stroke="#26d1ff" stroke-width="4"/>
      </g>

      <!-- Title -->
      <g transform="translate(0,720)" filter="url(#glow)">
        <text x="448" y="0" text-anchor="middle" fill="#a8e9ff" font-family="Montserrat, Arial Black, sans-serif" font-size="72" font-weight="800" letter-spacing="2">${title}</text>
      </g>
    </g>
  </svg>`;
}

// Renderiza o selo personalizado no canvas e retorna dataURL
async function renderPersonalizedBadge({ studentName, subtitle = "CONQUISTA DESBLOQUEADA" }){
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // base
  const baseSvg = getBadgeBaseSVG("PROGRAMADOR DECISIVO");
  const baseImg = new Image();
  baseImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(baseSvg);
  await new Promise(res=>{ baseImg.onload = res; });
  ctx.drawImage(baseImg, 0, 0);

  // Nome do aluno (neon)
  ctx.font = "bold 44px Montserrat, Arial Black, sans-serif";
  ctx.fillStyle = "#b7fbff";
  ctx.textAlign = "center";
  ctx.shadowColor = "#29e0ff";
  ctx.shadowBlur = 18;
  ctx.fillText((studentName || "ALUNO" ).toUpperCase(), 512, 970);
  ctx.shadowBlur = 0;

  // Subtítulo leve
  ctx.font = "600 24px Montserrat, Arial, sans-serif";
  ctx.fillStyle = "#7ee3ff";
  ctx.fillText(subtitle, 512, 935);

  return canvas.toDataURL("image/png");
}

// ————— Quiz —————
const QUIZ = {
  code: "QUIZ_DECISAO_01",
  title: "Programador Decisivo",
  passScore: 80,
  questions: [
    { q: "Você precisa decidir entre duas soluções: uma elegante porém lenta, outra simples e rápida. O prazo é crítico. O que faz?", a: ["Escolho a elegante; performance é secundária", "Escolho a rápida e simples, documento riscos e otimizo depois", "Espero mais requisitos"], correct: 1 },
    { q: "Ao analisar um bug intermitente em produção, qual primeiro passo decisivo?", a: ["Refatorar tudo imediatamente", "Reproduzir o erro com logs e métricas controladas", "Trocar de biblioteca"], correct: 1 },
    { q: "Feature crítica: pouco tempo, muitas dependências. Estratégia?", a: ["Código direto na master", "Criar feature flag + rollout progressivo", "Ignorar testes"], correct: 1 },
    { q: "Dados sensíveis no log. Ação correta?", a: ["Deixo por enquanto", "Mascaro/remoção imediata e rotação de credenciais", "Só aviso o time"], correct: 1 },
    { q: "Você herda script sem testes. Próximo passo?", a: ["Subo pra prod assim mesmo", "Escrevo testes mínimos de fumaça antes de mexer", "Troco a linguagem"], correct: 1 },
    { q: "Validação de entrada do usuário:", a: ["Confio no front", "Valido no backend com esquema (pydantic/validador)", "Só no banco"], correct: 1 },
    { q: "Escolha de estrutura de dados para buscas rápidas por chave:", a: ["Lista", "Dicionário/HashMap", "Tupla"], correct: 1 },
    { q: "Automação recorrente diária: onde rodar?", a: ["Na minha máquina", "Em job agendado (serverless/cron)", "No celular"], correct: 1 },
    { q: "Pull request grande demais:", a: ["Mando assim mesmo", "Divido em PRs menores com escopo claro", "Faço um zip"], correct: 1 },
    { q: "Métrica chave de decisão de negócio para um quiz educacional:", a: ["Cliques no menu", "Taxa de aprovação e conclusão", "Quantidade de cores no app"], correct: 1 },
  ]
};

// ————— Componentes —————
function AuthGate({ onAuth }){
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e)=>{
    e.preventDefault();
    setLoading(true);
    await new Promise(r=>setTimeout(r, 400));
    saveUser(email.trim());
    onAuth(email.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} className="w-full max-w-md bg-slate-900/70 rounded-2xl p-6 shadow-xl border border-cyan-500/20">
        <h1 className="text-2xl font-extrabold tracking-tight">Painel de Conquistas</h1>
        <p className="text-slate-300 mt-1">Acesse com seu e-mail de aluno Hotmart.</p>
        <form onSubmit={handleLogin} className="mt-4 space-y-3">
          <input type="email" required placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-400"/>
          <button disabled={loading || !email} className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-extrabold py-3 transition">Entrar</button>
        </form>
      </motion.div>
    </div>
  );
}

function BadgeCard({ unlocked, title, imgSrc }){
  return (
    <div className={classNames("relative rounded-2xl p-4 border backdrop-blur",
      unlocked ? "border-cyan-400/40 bg-slate-900/60" : "border-slate-700 bg-slate-900/40")}
    >
      <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={title} className="w-full h-full object-cover"/>
        ) : (
          <div className="text-slate-500 text-center px-6">
            <div className="text-6xl mb-2">🔒</div>
            <div className="font-bold">Bloqueado</div>
          </div>
        )}
      </div>
      <div className="mt-3 font-extrabold tracking-wide">{title}</div>
      {!unlocked && <div className="text-xs text-slate-400">Conclua o quiz para desbloquear</div>}
    </div>
  );
}

function Quiz({ onPassed }){
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (qi, idx)=>{
    setAnswers(prev=>({ ...prev, [qi]: idx }));
  };

  const canSubmit = Object.keys(answers).length === QUIZ.questions.length;

  const submit = ()=>{
    let s = 0;
    QUIZ.questions.forEach((q,i)=>{ if(answers[i] === q.correct) s += 1; });
    const pct = Math.round((s / QUIZ.questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
    if (pct >= QUIZ.passScore) onPassed(pct);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-extrabold">{QUIZ.title}</h3>
        <div className="text-xs text-slate-400">Nota de corte: {QUIZ.passScore}%</div>
      </div>
      <div className="mt-4 space-y-6">
        {QUIZ.questions.map((q, qi)=> (
          <div key={qi} className="">
            <div className="font-bold text-slate-100">{qi+1}. {q.q}</div>
            <div className="mt-2 grid gap-2">
              {q.a.map((opt, idx)=> (
                <label key={idx} className={classNames("cursor-pointer rounded-xl border p-3 text-sm",
                  answers[qi]===idx ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 hover:border-slate-600")}
                >
                  <input type="radio" name={`q${qi}`} className="mr-2" checked={answers[qi]===idx} onChange={()=>handleSelect(qi, idx)} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button onClick={submit} disabled={!canSubmit} className="rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-900 font-extrabold px-5 py-3">Enviar respostas</button>
        {submitted && (
          <div className={classNames("text-sm font-bold", score >= QUIZ.passScore ? "text-emerald-400" : "text-rose-400")}>Sua nota: {score}%</div>
        )}
      </div>
    </div>
  );
}

export default function App(){
  const [email, setEmail] = useState("");
  const [badges, setBadges] = useState(loadBadges());
  const [downloading, setDownloading] = useState(false);
  const userName = useMemo(()=> email?.split("@")[0] || "Aluno", [email]);

  useEffect(()=>{
    const e = getUser();
    if (e) setEmail(e);
  }, []);

  const hasProgramadorDecisivo = useMemo(()=>
    badges.some(b=> b.code === "PROGRAMADOR_DECISIVO"), [badges]
  );

  const programadorDecisivoImg = useMemo(()=>
    badges.find(b=> b.code === "PROGRAMADOR_DECISIVO")?.imageDataUrl || null,
  [badges]);

  async function handlePassed(score){
    // Gera selo personalizado e salva
    const png = await renderPersonalizedBadge({ studentName: userName, subtitle: `Aprovado com ${score}%` });
    const existing = loadBadges();
    if (!existing.find(b=> b.code === "PROGRAMADOR_DECISIVO")){
      const entry = {
        code: "PROGRAMADOR_DECISIVO",
        name: "Programador Decisivo",
        imageDataUrl: png,
        earnedAt: new Date().toISOString()
      };
      const next = [entry, ...existing];
      saveBadges(next);
      setBadges(next);
    }
  }

  const downloadBadge = async ()=>{
    try{
      setDownloading(true);
      const url = programadorDecisivoImg;
      const a = document.createElement('a');
      a.href = url;
      a.download = `Selo-Programador-Decisivo-${userName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  };

  if (!email) return <AuthGate onAuth={setEmail} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between py-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight">Painel de Conquistas</div>
            <div className="text-xs text-slate-400">Logado como <span className="font-semibold text-cyan-300">{email}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>{localStorage.removeItem(LS_USER_KEY); location.reload();}} className="text-xs px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600">Sair</button>
          </div>
        </header>

        <main className="grid lg:grid-cols-3 gap-6">
          {/* Coluna 1: Quiz */}
          <div className="lg:col-span-2">
            <Quiz onPassed={handlePassed} />

            <AnimatePresence>
              {hasProgramadorDecisivo && (
                <motion.div initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="font-extrabold text-emerald-300">Conquista desbloqueada!</div>
                      <div className="text-sm text-emerald-200">Você ganhou o selo <span className="font-bold">Programador Decisivo</span>.</div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button onClick={downloadBadge} className="rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-extrabold px-5 py-3 disabled:opacity-50" disabled={!programadorDecisivoImg || downloading}>{downloading? "Gerando..." : "Baixar selo"}</button>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fseu-dominio.com%2Fconquistas" target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-300/50 px-5 py-3 font-bold text-emerald-200 hover:text-emerald-100">Compartilhar</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Coluna 2: Painel de Selos */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-700 p-5 bg-slate-900/50">
              <div className="font-extrabold">Seus Selos</div>
              <div className="text-xs text-slate-400">Progresso na Missão</div>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <BadgeCard unlocked={hasProgramadorDecisivo} title="Programador Decisivo" imgSrc={programadorDecisivoImg} />
                <BadgeCard unlocked={false} title="Executor Preciso" />
                <BadgeCard unlocked={false} title="Analista Implacável" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 p-5 bg-slate-900/50">
              <div className="font-extrabold">Regras da Conquista</div>
              <ul className="mt-2 list-disc list-inside text-sm text-slate-300 space-y-1">
                <li>Responda ao quiz com pelo menos <span className="font-bold text-cyan-300">{QUIZ.passScore}%</span> de acerto.</li>
                <li>O selo é gerado com seu nome e pode ser baixado em PNG.</li>
                <li>As conquistas ficam salvas neste dispositivo (MVP). Em produção, use banco de dados.</li>
              </ul>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
