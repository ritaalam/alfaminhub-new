import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  Compass,
  Sparkles,
  Star,
  Mail,
  MapPin,
  Phone,
  ArrowDown,
  Sun,
  Eye,
  Flame,
  Megaphone,
} from 'lucide-react';

/* ---------------------------------- SVG ART ---------------------------------- */

const Sunburst = ({ colors = ['#FFC700', '#FF5500'], rays = 28, className = '' }) => {
  const paths = [];
  for (let i = 0; i < rays; i++) {
    const a1 = (i / rays) * Math.PI * 2;
    const a2 = ((i + 0.5) / rays) * Math.PI * 2;
    const r = 320;
    const x1 = 300 + Math.cos(a1) * r;
    const y1 = 300 + Math.sin(a1) * r;
    const x2 = 300 + Math.cos(a2) * r;
    const y2 = 300 + Math.sin(a2) * r;
    paths.push(
      <path
        key={i}
        d={`M300 300 L${x1} ${y1} L${x2} ${y2} Z`}
        fill={colors[i % colors.length]}
      />
    );
  }
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden="true">
      {paths}
    </svg>
  );
};

const OpRings = ({ colors = ['#3B1A66', '#FF2E92'], count = 9, className = '' }) => (
  <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <circle
        key={i}
        cx="200"
        cy="200"
        r={190 - i * (180 / count)}
        fill={colors[i % colors.length]}
      />
    ))}
  </svg>
);

const Blob = ({ fill = '#FF5500', className = '' }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
    <path
      fill={fill}
      d="M48.2,-58.4C61.3,-48.6,70.2,-32.5,73.6,-15.2C77,2.1,74.9,20.6,66.1,35.2C57.3,49.8,41.8,60.5,24.6,67.2C7.4,73.9,-11.5,76.6,-28.4,71C-45.3,65.4,-60.2,51.5,-68.4,34.4C-76.6,17.3,-78.1,-3,-71.6,-19.9C-65.1,-36.8,-50.6,-50.3,-35.3,-59.6C-20,-68.9,-3.9,-74,11.5,-72.2C26.9,-70.4,35.1,-68.2,48.2,-58.4Z"
      transform="translate(100 100)"
    />
  </svg>
);

const WavyLines = ({ stroke = '#FF2E92', className = '' }) => (
  <svg viewBox="0 0 400 300" className={className} preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: 8 }).map((_, i) => (
      <path
        key={i}
        d={`M-20 ${20 + i * 38} Q 50 ${-10 + i * 38}, 100 ${20 + i * 38} T 220 ${20 + i * 38} T 340 ${20 + i * 38} T 460 ${20 + i * 38}`}
        fill="none"
        stroke={stroke}
        strokeWidth="10"
        opacity={0.9 - i * 0.06}
      />
    ))}
  </svg>
);

const FlowerPower = ({ petals = '#FFC700', center = '#FF5500', className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    {Array.from({ length: 8 }).map((_, i) => (
      <ellipse
        key={i}
        cx="50"
        cy="22"
        rx="13"
        ry="22"
        fill={petals}
        transform={`rotate(${i * 45} 50 50)`}
      />
    ))}
    <circle cx="50" cy="50" r="15" fill={center} />
  </svg>
);

/* -------------------------------- ANIM HELPERS -------------------------------- */

const panelReveal = (i: number): Variants => ({
  hidden: { opacity: 0, y: 60, rotate: i % 2 === 0 ? -1.5 : 1.5 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.85,
      delay: i * 0.28,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
});

const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
};

/* ----------------------------------- DATA ----------------------------------- */

const quests = [
  {
    num: '01',
    title: 'Ask the Question That Scares You',
    bg: '#FFC700',
    ink: '#3B1A66',
    accent: '#FF5500',
    icon: Eye,
    steps: [
      'Find one thing today you don\u2019t understand. A cloud, a beetle, a number.',
      'Say your question out loud — heroes never whisper their wonder.',
      'Write it on your Quest Card and pin it to the Wall of Mysteries.',
      'Hunt the answer with a grown-up, a book, or a brave experiment.',
    ],
    badge: 'EARN: THE EYEBALL OF WONDER',
  },
  {
    num: '02',
    title: 'Fail Loudly. Then Try Again.',
    bg: '#FF2E92',
    ink: '#FFF3DC',
    accent: '#FFC700',
    icon: Flame,
    steps: [
      'Build it, draw it, solve it — even if it might wobble or splat.',
      'When it goes wrong, shout “PLOT TWIST!” That\u2019s the hero rule.',
      'Circle the part that broke. That\u2019s where the treasure is hiding.',
      'Try version two before bedtime. Heroes always return to the dragon.',
    ],
    badge: 'EARN: THE FLAME OF SECOND TRIES',
  },
  {
    num: '03',
    title: 'Teach What You Learned',
    bg: '#3B1A66',
    ink: '#FFF3DC',
    accent: '#1FC8A0',
    icon: Megaphone,
    steps: [
      'Pick your favourite discovery from this week\u2019s quests.',
      'Explain it to someone smaller, older, or furrier than you.',
      'Use a drawing, a song, or a very dramatic puppet show.',
      'Sign the Hero Ledger — knowledge shared is a power doubled.',
    ],
    badge: 'EARN: THE GOLDEN MEGAPHONE',
  },
];

/* ----------------------------------- APP ----------------------------------- */

export default function App() {
  const [hoverPanel, setHoverPanel] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#F6E7C8] text-[#3B1A66] overflow-x-hidden mq-root">
      <link
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..900,100,1&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .mq-root { font-family: 'Oswald', sans-serif; }
        .font-serif-wide { font-family: 'Fraunces', serif; font-variation-settings: 'SOFT' 100, 'WONK' 1; }
        .font-cond { font-family: 'Oswald', sans-serif; letter-spacing: 0.08em; }
        @keyframes mq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes mq-spin-rev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes mq-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes mq-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(10px); } }
        @keyframes mq-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .mq-spin-slow { animation: mq-spin 60s linear infinite; }
        .mq-spin-slower { animation: mq-spin-rev 90s linear infinite; }
        .mq-pulse { animation: mq-pulse 5s ease-in-out infinite; }
        .mq-bob { animation: mq-bob 2.4s ease-in-out infinite; }
        .mq-marquee-track { display: flex; width: max-content; animation: mq-marquee 22s linear infinite; }
        .mq-paper {
          box-shadow: 0 1px 0 rgba(59,26,102,0.18), 0 14px 40px -12px rgba(59,26,102,0.35);
        }
        .mq-grain::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.07; mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .mq-fold {
          background-image: repeating-linear-gradient(to bottom, rgba(59,26,102,0.45) 0 10px, transparent 10px 20px);
          width: 2px;
        }
        .mq-outline-text {
          -webkit-text-stroke: 2px #FFF3DC; color: transparent;
        }
        ::selection { background: #FF2E92; color: #FFF3DC; }
      `,
        }}
      />

      {/* ======================= NAV ======================= */}
      <header className="sticky top-0 z-50 bg-[#3B1A66] text-[#FFF3DC]">
        <div className="flex items-center justify-between px-5 sm:px-8 py-3 border-b-4 border-[#FF5500]">
          <div className="flex items-center gap-3">
            <FlowerPower className="w-8 h-8 mq-spin-slow" petals="#FFC700" center="#FF2E92" />
            <span className="font-cond uppercase font-700 text-lg tracking-[0.25em]">Mindquest</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 font-cond uppercase text-sm tracking-[0.2em]">
            {['The Quests', 'Hero Code', 'Field Kits', 'Grown-Ups'].map((l) => (
              <a key={l} href="#" className="hover:text-[#FFC700] transition-colors duration-200">
                {l}
              </a>
            ))}
          </nav>
          <button className="font-cond uppercase text-sm tracking-[0.2em] bg-[#FF2E92] hover:bg-[#FF5500] transition-colors px-5 py-2 rounded-full text-[#FFF3DC]">
            Enroll a Hero
          </button>
        </div>
        {/* marquee */}
        <div className="overflow-hidden bg-[#FFC700] text-[#3B1A66] py-1.5">
          <div className="mq-marquee-track font-cond uppercase text-xs tracking-[0.3em] font-600">
            {Array.from({ length: 2 }).map((_, k) => (
              <span key={k} className="flex items-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className="flex items-center gap-3 px-4">
                    <Star className="w-3 h-3 fill-[#FF5500] text-[#FF5500]" />
                    Print Kit · Tri-Fold № 03 · How to Be Brave With Your Brain · Ages 6–11
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ======================= INTRO ======================= */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        variants={sectionReveal}
        className="relative px-6 sm:px-10 pt-16 pb-20 max-w-6xl mx-auto text-center"
      >
        <div className="absolute -top-10 -left-24 w-72 h-72 opacity-25 mq-spin-slower pointer-events-none">
          <OpRings colors={['#FF5500', '#F6E7C8']} />
        </div>
        <div className="absolute top-24 -right-20 w-56 h-56 opacity-25 mq-pulse pointer-events-none">
          <Blob fill="#FF2E92" />
        </div>

        <p className="font-cond uppercase tracking-[0.4em] text-sm text-[#FF5500] mb-6">
          Brochure spread · Fold guide · Spring quest season
        </p>
        <h1 className="font-serif-wide font-black text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] max-w-4xl mx-auto">
          Unfold the map.
          <br />
          <span className="text-[#FF2E92]">Become the hero</span> of your own brain.
        </h1>
        <p className="mt-8 max-w-xl mx-auto font-cond uppercase tracking-[0.15em] text-base text-[#3B1A66]/80">
          Scroll to open the tri-fold — outside panels first, then the inside quest spread.
        </p>
        <div className="mt-10 flex justify-center">
          <div className="mq-bob w-12 h-12 rounded-full bg-[#3B1A66] text-[#FFC700] flex items-center justify-center">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>
      </motion.section>

      {/* ======================= OUTSIDE SPREAD ======================= */}
      <section className="px-4 sm:px-10 pb-24 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={sectionReveal}
          className="flex items-end justify-between mb-6 border-b-2 border-[#3B1A66]/30 pb-3"
        >
          <h2 className="font-cond uppercase tracking-[0.3em] text-sm font-600">
            Spread A — Outside of Fold
          </h2>
          <span className="font-cond uppercase tracking-[0.2em] text-xs text-[#3B1A66]/60">
            Back · Oath flap · Front cover
          </span>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="grid md:grid-cols-[1fr_2px_1fr_2px_1fr] gap-4 md:gap-0"
        >
          {/* PANEL — BACK */}
          <motion.div
            variants={panelReveal(0)}
            onMouseEnter={() => setHoverPanel('back')}
            onMouseLeave={() => setHoverPanel(null)}
            className="relative mq-paper mq-grain bg-[#3B1A66] text-[#FFF3DC] aspect-[10/16] overflow-hidden md:rounded-l-2xl"
          >
            <div className="absolute -bottom-24 -right-24 w-80 h-80 mq-spin-slower opacity-90">
              <OpRings colors={['#FF2E92', '#3B1A66', '#FFC700', '#3B1A66']} count={11} />
            </div>
            <div className="relative z-10 p-7 flex flex-col h-full">
              <span className="font-cond uppercase tracking-[0.3em] text-[10px] text-[#FFC700]">
                Panel 6 · Back
              </span>
              <h3 className="font-serif-wide font-black text-3xl leading-tight mt-6">
                The adventure waits, folded shut.
              </h3>
              <p className="font-cond text-sm tracking-[0.05em] mt-4 text-[#FFF3DC]/75 leading-relaxed">
                Mindquest Learning Co. runs after-school quest labs in 14 cities, every weekday at the brave hour of 3:30 PM.
              </p>
              <div className="mt-auto space-y-3 font-cond text-sm tracking-[0.05em]">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#FF2E92]" /> 88 Wonder Lane, Portland OR
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#FFC700]" /> (503) 555-0188
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#1FC8A0]" /> heroes@mindquest.fun
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-[#FFF3DC]/20 pt-4">
                <span className="font-cond uppercase text-[10px] tracking-[0.3em]">mindquest.fun</span>
                <FlowerPower className="w-9 h-9 mq-spin-slow" petals="#FF2E92" center="#FFC700" />
              </div>
            </div>
          </motion.div>

          <div className="hidden md:block mq-fold" />

          {/* PANEL — OATH FLAP */}
          <motion.div
            variants={panelReveal(1)}
            className="relative mq-paper mq-grain bg-[#F6E7C8] aspect-[10/16] overflow-hidden"
          >
            <WavyLines className="absolute inset-x-0 top-0 h-40 w-full opacity-20" stroke="#FF5500" />
            <WavyLines className="absolute inset-x-0 bottom-0 h-40 w-full opacity-20 rotate-180" stroke="#FF2E92" />
            <div className="relative z-10 p-7 flex flex-col h-full">
              <span className="font-cond uppercase tracking-[0.3em] text-[10px] text-[#FF5500]">
                Panel 5 · Fold-in flap
              </span>
              <h3 className="font-serif-wide font-black text-[2.1rem] leading-[1.05] mt-5">
                The Hero&rsquo;s Oath
              </h3>
              <p className="font-cond text-xs uppercase tracking-[0.2em] mt-2 text-[#3B1A66]/60">
                Read aloud. Loudly. Possibly on a chair.
              </p>
              <div className="mt-6 space-y-4">
                {[
                  'I will wonder out loud, even when it sounds silly.',
                  'I will treat every mistake like a secret door.',
                  'I will help another hero before the bell rings.',
                  'I will never say “I can\u2019t” — only “I can\u2019t YET.”',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-cond text-xs font-700 text-[#FFF3DC]"
                      style={{ background: ['#FF5500', '#FF2E92', '#3B1A66', '#1FA37A'][i] }}
                    >
                      {i + 1}
                    </div>
                    <p className="font-serif-wide text-[15px] leading-snug font-medium">{line}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto border-2 border-dashed border-[#3B1A66]/40 rounded-xl p-4 text-center">
                <p className="font-cond uppercase text-[10px] tracking-[0.3em] text-[#3B1A66]/60">
                  Hero signature
                </p>
                <p className="font-serif-wide italic text-2xl mt-1 text-[#FF2E92]">x ____________</p>
              </div>
            </div>
          </motion.div>

          <div className="hidden md:block mq-fold" />

          {/* PANEL — FRONT COVER */}
          <motion.div
            variants={panelReveal(2)}
            onMouseEnter={() => setHoverPanel('cover')}
            onMouseLeave={() => setHoverPanel(null)}
            className="relative mq-paper mq-grain bg-[#FF5500] text-[#FFF3DC] aspect-[10/16] overflow-hidden md:rounded-r-2xl"
          >
            <Sunburst
              colors={['#FF5500', '#FFC700']}
              className={`absolute -top-1/4 left-1/2 -translate-x-1/2 w-[160%] mq-spin-slow transition-transform duration-700 ${
                hoverPanel === 'cover' ? 'scale-110' : ''
              }`}
            />
            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#3B1A66] via-[#3B1A66]/60 to-transparent" />
            <div className="relative z-10 p-7 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <span className="font-cond uppercase tracking-[0.3em] text-[10px]">Panel 1 · Cover</span>
                <span className="font-cond uppercase tracking-[0.2em] text-[10px] bg-[#3B1A66] px-3 py-1 rounded-full">
                  Ages 6–11
                </span>
              </div>
              <div className="mt-10 flex justify-center">
                <div className="relative w-28 h-28 mq-pulse">
                  <OpRings colors={['#FFF3DC', '#FF2E92', '#FFC700', '#3B1A66']} count={7} className="w-full h-full" />
                  <Compass className="absolute inset-0 m-auto w-9 h-9 text-[#FFF3DC]" />
                </div>
              </div>
              <h3 className="font-serif-wide font-black text-center text-[2.5rem] leading-[0.98] mt-8">
                How to Be{' '}
                <span className="mq-outline-text">Brave</span>
                <br />
                With Your Brain
              </h3>
              <p className="text-center font-cond uppercase tracking-[0.25em] text-xs mt-4 text-[#FFC700]">
                A three-quest field guide
              </p>
              <div className="mt-auto text-center">
                <p className="font-cond uppercase tracking-[0.4em] text-sm font-700">Mindquest</p>
                <p className="font-cond uppercase tracking-[0.2em] text-[10px] text-[#FFF3DC]/70 mt-1">
                  Learning labs for small, mighty humans
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ======================= WAVY DIVIDER ======================= */}
      <div className="relative h-20 -mt-6">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <path
            d="M0 60 Q 120 0 240 60 T 480 60 T 720 60 T 960 60 T 1200 60 T 1440 60 V120 H0 Z"
            fill="#3B1A66"
          />
        </svg>
      </div>

      {/* ======================= INSIDE SPREAD ======================= */}
      <section className="bg-[#3B1A66] px-4 sm:px-10 pb-28 pt-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={sectionReveal}
            className="flex items-end justify-between mb-6 border-b-2 border-[#FFF3DC]/25 pb-3 text-[#FFF3DC]"
          >
            <h2 className="font-cond uppercase tracking-[0.3em] text-sm font-600">
              Spread B — Inside of Fold · The Three Quests
            </h2>
            <span className="font-cond uppercase tracking-[0.2em] text-xs text-[#FFF3DC]/50">
              How-to sequence · Left to right
            </span>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-[1fr_2px_1fr_2px_1fr] gap-4 md:gap-0"
          >
            {quests.map((q, i) => {
              const Icon = q.icon;
              return (
                <>
                  {i > 0 && <div key={`fold-${i}`} className="hidden md:block mq-fold opacity-60" />}
                  <motion.div
                    key={q.num}
                    variants={panelReveal(i)}
                    className={`relative mq-paper mq-grain aspect-[10/16] overflow-hidden ${
                      i === 0 ? 'md:rounded-l-2xl' : i === 2 ? 'md:rounded-r-2xl' : ''
                    }`}
                    style={{ background: q.bg, color: q.ink }}
                  >
                    {/* deco */}
                    {i === 0 && (
                      <Blob fill="#FF5500" className="absolute -top-16 -right-16 w-64 h-64 opacity-30 mq-pulse" />
                    )}
                    {i === 1 && (
                      <Sunburst
                        colors={['#FF2E92', '#D11D78']}
                        rays={36}
                        className="absolute -bottom-1/3 -left-1/3 w-[120%] mq-spin-slower opacity-70"
                      />
                    )}
                    {i === 2 && (
                      <OpRings
                        colors={['#1FC8A0', '#3B1A66']}
                        count={10}
                        className="absolute -top-20 -left-20 w-72 h-72 opacity-50 mq-spin-slow"
                      />
                    )}

                    <div className="relative z-10 p-7 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <span className="font-cond uppercase tracking-[0.3em] text-[10px] opacity-70">
                          Quest {q.num}
                        </span>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: q.accent, color: i === 1 ? '#3B1A66' : '#FFF3DC' }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>

                      <p
                        className="font-serif-wide font-black mt-4"
                        style={{ fontSize: '4.5rem', lineHeight: 0.85, color: q.accent }}
                      >
                        {q.num}
                      </p>
                      <h3 className="font-serif-wide font-black text-[1.75rem] leading-[1.05] mt-3">
                        {q.title}
                      </h3>

                      <ol className="mt-6 space-y-3.5">
                        {q.steps.map((s, si) => (
                          <li key={si} className="flex gap-3 items-start">
                            <span
                              className="font-cond font-700 text-xs mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
                              style={{
                                background: q.ink,
                                color: q.bg,
                              }}
                            >
                              {si + 1}
                            </span>
                            <p className="font-cond text-[13px] leading-snug tracking-[0.02em] opacity-90">
                              {s}
                            </p>
                          </li>
                        ))}
                      </ol>

                      <div
                        className="mt-auto rounded-full px-4 py-2.5 flex items-center gap-2 justify-center font-cond uppercase tracking-[0.18em] text-[11px] font-600"
                        style={{ background: q.accent, color: i === 1 ? '#3B1A66' : '#FFF3DC' }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {q.badge}
                      </div>
                    </div>
                  </motion.div>
                </>
              );
            })}
          </motion.div>

          {/* CTA strip */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={sectionReveal}
            className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#FFC700] rounded-2xl px-8 py-7 mq-paper"
          >
            <div className="flex items-center gap-4">
              <Sun className="w-10 h-10 text-[#FF5500] mq-spin-slow" />
              <div>
                <p className="font-serif-wide font-black text-2xl text-[#3B1A66] leading-tight">
                  Print it. Fold it. Hand it to a brave kid.
                </p>
                <p className="font-cond uppercase tracking-[0.2em] text-xs text-[#3B1A66]/70 mt-1">
                  Free classroom packs of 30 · Recycled stock · Soy inks
                </p>
              </div>
            </div>
            <button className="font-cond uppercase tracking-[0.2em] text-sm bg-[#3B1A66] text-[#FFF3DC] px-8 py-4 rounded-full hover:bg-[#FF2E92] transition-colors duration-300 whitespace-nowrap">
              Request the Print Kit
            </button>
          </motion.div>
        </div>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer className="bg-[#2A1149] text-[#FFF3DC]/70 px-6 sm:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-cond uppercase tracking-[0.25em] text-[11px]">
          <span>© 1969 → 2025 Mindquest Learning Co.</span>
          <span className="flex items-center gap-2">
            <Star className="w-3 h-3 fill-[#FFC700] text-[#FFC700]" />
            Designed loudly in Portland, Oregon
          </span>
          <span>Tri-fold № 03 · Rev B</span>
        </div>
      </footer>
    </div>
  );
}