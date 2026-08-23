import { useState, useEffect } from 'react';
import {
  Sun, Droplets, Shield, Sparkles, ArrowUpRight, ArrowRight,
  Bell, ScanFace, BookOpen, House, ChartLine, User, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell
} from 'recharts';

const HEADLINE = "Your skin is winning.";

const hydrationData = [
  { d: 'M', v: 61 }, { d: 'T', v: 64 }, { d: 'W', v: 59 },
  { d: 'T', v: 68 }, { d: 'F', v: 73 }, { d: 'S', v: 78 }, { d: 'S', v: 82 },
];

const routineData = [
  { d: 'M', am: 1, pm: 1 }, { d: 'T', am: 1, pm: 1 }, { d: 'W', am: 1, pm: 0 },
  { d: 'T', am: 1, pm: 1 }, { d: 'F', am: 1, pm: 1 }, { d: 'S', am: 0, pm: 1 }, { d: 'S', am: 1, pm: 1 },
];

const metrics = [
  { icon: Droplets, label: 'Hydration', value: '82', unit: '/100', delta: '+9.4%', good: true },
  { icon: Shield, label: 'Barrier strength', value: '74', unit: '/100', delta: '+5.1%', good: true },
  { icon: Sun, label: 'UV exposure', value: '2.1', unit: 'hrs', delta: '−18%', good: true },
  { icon: Sparkles, label: 'Texture score', value: '68', unit: '/100', delta: '+2.3%', good: true },
];

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: string | number }>;
};

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#161B12] text-[#F2EDE2] px-3 py-1.5 text-[11px] tracking-wide font-medium rounded-none">
      {payload[0].value}<span className="opacity-60">/100</span>
    </div>
  );
}

export default function App() {
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState('home');
  const [range, setRange] = useState('7D');

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(HEADLINE.slice(0, i));
      if (i >= HEADLINE.length) {
        clearInterval(t);
        setTimeout(() => setDone(true), 900);
      }
    }, 55);
    return () => clearInterval(t);
  }, []);

  // split typed text so "winning." renders italic serif as it types
  const splitIdx = HEADLINE.indexOf('winning');
  const sansPart = typed.slice(0, splitIdx);
  const serifPart = typed.slice(splitIdx);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#11140E] py-10 font-['Archivo']">
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Archivo:wght@400;500;600;700;800&family=Archivo+Expanded:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .serif-i { font-family: 'Fraunces', serif; font-style: italic; }
        .serif { font-family: 'Fraunces', serif; }
        .caret { display:inline-block; width:3px; height:0.95em; background:#C8501F; margin-left:3px; transform:translateY(0.12em); animation: blink 0.85s step-end infinite; }
        .caret.gone { animation: fadeout 0.4s forwards; }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        @keyframes fadeout { to { opacity:0; } }
        .phone-scroll::-webkit-scrollbar { width: 0px; }
        .grain::after {
          content:''; position:absolute; inset:0; pointer-events:none; opacity:0.5; mix-blend-mode:multiply;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
        .ticker { animation: tick 18s linear infinite; }
        @keyframes tick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}} />

      {/* PHONE */}
      <div className="relative w-[393px] h-[852px] bg-[#F2EDE2] overflow-hidden rounded-[44px] ring-[10px] ring-[#1d2218] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">

        <div className="phone-scroll relative h-full overflow-y-auto pb-28 grain">

          {/* STATUS BAR */}
          <div className="flex items-center justify-between px-7 pt-4 text-[12px] font-semibold text-[#161B12]">
            <span>9:41</span>
            <span className="tracking-[0.18em] text-[10px]">●●●●&nbsp; ᯤ &nbsp;▮</span>
          </div>

          {/* HEADER */}
          <header className="flex items-center justify-between px-6 pt-5">
            <div>
              <div className="font-['Archivo_Expanded'] font-bold text-[15px] tracking-[0.22em] text-[#161B12]">AUREN<span className="text-[#C8501F]">.</span></div>
              <div className="text-[10px] tracking-[0.28em] uppercase text-[#7a7565] mt-0.5">Skin Intelligence Report</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 border border-[#161B12]/20 flex items-center justify-center hover:bg-[#161B12] hover:text-[#F2EDE2] transition-colors text-[#161B12]">
                <Bell size={16} strokeWidth={1.75} />
              </button>
              <div className="w-10 h-10 overflow-hidden border border-[#161B12]">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </header>

          {/* ISSUE LINE */}
          <div className="mx-6 mt-6 flex items-end justify-between border-b-2 border-[#161B12] pb-2">
            <span className="text-[10px] tracking-[0.3em] uppercase font-semibold text-[#161B12]">Vol. 12 — Week 04</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#7a7565]">Feb 17 – 23</span>
          </div>

          {/* HERO HEADLINE — typing */}
          <div className="px-6 pt-7">
            <h1 className="text-[42px] leading-[0.98] text-[#161B12] font-['Archivo_Expanded'] font-bold tracking-tight min-h-[126px]">
              {sansPart}
              {serifPart && (
                <span className="serif-i font-medium text-[#274A2C] text-[46px]">{serifPart}</span>
              )}
              <span className={`caret ${done ? 'gone' : ''}`} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: typed.length > 8 ? 1 : 0, y: typed.length > 8 ? 0 : 8 }}
              transition={{ duration: 0.6 }}
              className="mt-3 text-[13px] leading-relaxed text-[#5b594e] max-w-[300px]"
            >
              Twenty-one consecutive days of routine adherence. Your barrier is the strongest it has been since you started tracking.
            </motion.p>
          </div>

          {/* HERO SCORE — overlapping photo + score plate */}
          <div className="relative mt-7 mx-6 h-[300px]">
            {/* photo */}
            <motion.div
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="absolute right-0 top-0 w-[78%] h-[260px] overflow-hidden z-0"
            >
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&h=900&fit=crop"
                alt="organic skincare botanicals"
                className="w-full h-full object-cover saturate-[0.85]"
              />
              <div className="absolute inset-0 bg-[#274A2C]/15 mix-blend-multiply" />
            </motion.div>

            {/* big number plate overlapping */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="absolute left-0 top-[58px] z-10 bg-[#16
              1B12] bg-[#161B12] text-[#F2EDE2] px-5 pt-5 pb-4 w-[200px] shadow-[12px_12px_0_#C8501F]"
            >
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#F2EDE2]/60">Skin Index</div>
              <div className="flex items-baseline mt-1">
                <span className="serif text-[72px] leading-none font-light">79</span>
                <span className="text-[14px] ml-1 text-[#F2EDE2]/50">/100</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[#9FE870] text-[12px] font-semibold">
                <ArrowUpRight size={14} /> +6 pts this week
              </div>
            </motion.div>

            {/* small caption tag overlapping bottom of photo */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="absolute right-3 bottom-0 z-20 bg-[#F2EDE2] border border-[#161B12] px-4 py-3 max-w-[220px]"
            >
              <p className="serif-i text-[15px] leading-snug text-[#161B12]">
                “Strong skin isn’t given. It’s built — morning by morning.”
              </p>
            </motion.div>
          </div>

          {/* TICKER */}
          <div className="mt-8 border-y border-[#161B12]/20 py-2 overflow-hidden">
            <div className="ticker whitespace-nowrap text-[10px] tracking-[0.3em] uppercase text-[#7a7565]">
              <span className="mx-4">21-day streak</span>·<span className="mx-4">Niacinamide cycle: day 12</span>·<span className="mx-4">SPF logged 7/7</span>·<span className="mx-4">Retinal night 3 of 4</span>·<span className="mx-4">21-day streak</span>·<span className="mx-4">Niacinamide cycle: day 12</span>·<span className="mx-4">SPF logged 7/7</span>·<span className="mx-4">Retinal night 3 of 4</span>·
            </div>
          </div>

          {/* HYDRATION CHART */}
          <section className="px-6 mt-8">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-[#7a7565] font-semibold">Section 01</div>
                <h2 className="font-['Archivo_Expanded'] font-bold text-[20px] text-[#161B12] mt-1">
                  Hydration <span className="serif-i font-medium text-[#274A2C]">trend</span>
                </h2>
              </div>
              <div className="flex border border-[#161B12]/25">
                {['7D', '30D', '90D'].map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${range === r ? 'bg-[#161B12] text-[#F2EDE2]' : 'text-[#161B12] hover:bg-[#161B12]/10'}`}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div className="relative mt-5">
              <div className="h-[180px] bg-[#E9E2D2] border border-[#161B12]/15 pt-4 pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hydrationData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hyd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#274A2C" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#274A2C" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: '#7a7565', fontFamily: 'Archivo' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#7a7565', fontFamily: 'Archivo' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#C8501F', strokeDasharray: '3 3' }} />
                    <Area type="monotone" dataKey="v" stroke="#274A2C" strokeWidth={2.5} fill="url(#hyd)" dot={{ r: 3, fill: '#F2EDE2', stroke: '#274A2C', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* overlapping annotation */}
              <div className="absolute -top-3 right-4 z-10 bg-[#C8501F] text-[#F2EDE2] px-3 py-1.5 text-[11px] font-bold tracking-wide">
                PEAK 82 · SUNDAY
              </div>
            </div>
          </section>

          {/* PULL QUOTE overlapping into metrics */}
          <div className="relative z-10 mx-6 mt-9 -mb-7">
            <div className="bg-[#274A2C] text-[#F2EDE2] px-6 py-6 shadow-[10px_10px_0_rgba(22,27,18,0.9)]">
              <p className="serif-i text-[21px] leading-[1.3]">
                “Consistency is the bravest thing a routine can ask of you — and you delivered, all seven days.”
              </p>
              <div className="mt-3 text-[10px] tracking-[0.3em] uppercase text-[#F2EDE2]/60">— Weekly editor’s note</div>
            </div>
          </div>

          {/* METRICS GRID */}
          <section className="px-6 pt-14 mt-0 bg-[#E9E2D2] pb-8 border-y border-[#161B12]/15">
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#7a7565] font-semibold">Section 02</div>
            <h2 className="font-['Archivo_Expanded'] font-bold text-[20px] text-[#161B12] mt-1 mb-5">
              Vital <span className="serif-i font-medium text-[#274A2C]">measures</span>
            </h2>
            <div className="grid grid-cols-2 gap-px bg-[#161B12]/20 border border-[#161B12]/20">
              {metrics.map((m) => (
                <div key={m.label} className="bg-[#F2EDE2] p-4 hover:bg-[#fffdf6] transition-colors group">
                  <m.icon size={16} strokeWidth={1.75} className="text-[#274A2C]" />
                  <div className="mt-4 flex items-baseline">
                    <span className="serif text-[34px] leading-none text-[#161B12]">{m.value}</span>
                    <span className="text-[11px] text-[#7a7565] ml-1">{m.unit}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-medium text-[#5b594e]">{m.label}</div>
                  <div className={`mt-2 text-[11px] font-bold ${m.good ? 'text-[#274A2C]' : 'text-[#C8501F]'}`}>{m.delta}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ROUTINE ADHERENCE */}
          <section className="px-6 mt-8">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-[#7a7565] font-semibold">Section 03</div>
                <h2 className="font-['Archivo_Expanded'] font-bold text-[20px] text-[#161B12] mt-1">
                  Routine <span className="serif-i font-medium text-[#274A2C]">discipline</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-[#C8501F] text-[12px] font-bold">
                <Flame size={14} /> 21-day streak
              </div>
            </div>

            <div className="mt-4 h-[110px] border border-[#161B12]/15 bg-[#E9E2D2] pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routineData} margin={{ top: 0, right: 14, left: 14, bottom: 0 }} barGap={3}>
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: '#7a7565', fontFamily: 'Archivo' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="am" radius={0} barSize={14}>
                    {routineData.map((e, i) => <Cell key={i} fill={e.am ? '#274A2C' : '#c9c0aa'} />)}
                  </Bar>
                  <Bar dataKey="pm" radius={0} barSize={14}>
                    {routineData.map((e, i) => <Cell key={i} fill={e.pm ? '#C8501F' : '#c9c0aa'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-5 text-[10px] tracking-[0.18em] uppercase text-[#7a7565]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#274A2C] inline-block" /> AM ritual</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#C8501F] inline-block" /> PM ritual</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#c9c0aa] inline-block" /> Missed</span>
            </div>
          </section>

          {/* NEXT MISSION */}
          <section className="mx-6 mt-8 relative">
            <div className="absolute -top-3 left-4 z-10 bg-[#161B12] text-[#F2EDE2] text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 font-semibold">
              Next mission
            </div>
            <div className="border-2 border-[#161B12] p-5 pt-7 bg-[#F2EDE2]">
              <h3 className="serif-i text-[22px] text-[#161B12] leading-tight">Conquer the dehydration dip.</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[#5b594e]">
                Your trans-epidermal water loss spikes mid-week. Add the Marula Barrier Concentrate on Tuesday and Wednesday nights to hold the line.
              </p>
              <button className="mt-4 w-full flex items-center justify-between bg-[#161B12] text-[#F2EDE2] px-4 py-3.5 text-[12px] font-bold tracking-[0.14em] uppercase hover:bg-[#274A2C] transition-colors">
                Add to evening ritual <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <div className="px-6 mt-8 mb-4 text-center text-[10px] tracking-[0.3em] uppercase text-[#7a7565]">
            Auren Skin Intelligence · Printed weekly, lived daily
          </div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="absolute bottom-0 inset-x-0 z-30 bg-[#161B12] text-[#F2EDE2]">
          <div className="grid grid-cols-4">
            {[
              { id: 'home', icon: House, label: 'Report' },
              { id: 'scan', icon: ScanFace, label: 'Scan' },
              { id: 'trends', icon: ChartLine, label: 'Trends' },
              { id: 'journal', icon: BookOpen, label: 'Journal' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 pt-3.5 pb-7 transition-colors ${tab === item.id ? 'text-[#F2EDE2]' : 'text-[#F2EDE2]/40 hover:text-[#F2EDE2]/70'}`}
              >
                <item.icon size={19} strokeWidth={tab === item.id ? 2.2 : 1.6} />
                <span className="text-[9px] tracking-[0.22em] uppercase font-semibold">{item.label}</span>
                {tab === item.id && <span className="absolute bottom-5 w-1 h-1 bg-[#C8501F]" />}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}