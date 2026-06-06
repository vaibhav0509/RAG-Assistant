import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ExternalLink, Mail, Phone, MapPin, Github, Linkedin,
  Globe, Briefcase, GraduationCap, Code2, Award, Star, Download,
  ChevronRight, Sparkles, RefreshCw, Lock,
} from "lucide-react";
import { parsePortfolio } from "../api/client";
import { useProcess } from "../context/ProcessContext";

// ─── Types ────────────────────────────────────────────────────────────────

interface Experience {
  company: string; role: string; start: string; end: string;
  location: string; bullets: string[];
}
interface Education {
  institution: string; degree: string; field: string;
  start: string; end: string; grade: string;
}
interface Project {
  name: string; description: string; url: string; tech: string[];
}
export interface Profile {
  name: string; gender: string; title: string; email: string;
  phone: string; location: string; linkedin: string; github: string;
  website: string; summary: string; skills: string[];
  languages: string[]; experience: Experience[]; education: Education[];
  projects: Project[]; certifications: string[]; links: string[];
  photo: string | null; source_filename: string;
}

// ─── Template registry ────────────────────────────────────────────────────

type TemplateId = "basic" | "creative" | "dark" | "oldschool" | "nineties";

const TEMPLATES: {
  id: TemplateId; label: string; tagline: string;
  preview: string; accent: string; available: boolean;
}[] = [
  { id: "basic",     label: "Basic",      tagline: "Clean & professional",  preview: "⬜", accent: "border-brand-400 bg-brand-50 text-brand-700",    available: true  },
  { id: "creative",  label: "Creative",   tagline: "Bold & full-bleed",     preview: "🎨", accent: "border-purple-400 bg-purple-50 text-purple-700",  available: true  },
  { id: "dark",      label: "Dark",       tagline: "Terminal aesthetic",     preview: "🖤", accent: "border-gray-600 bg-gray-800 text-green-400",      available: false },
  { id: "oldschool", label: "Old School", tagline: "1960s letterhead",       preview: "📜", accent: "border-amber-500 bg-amber-50 text-amber-800",     available: false },
  { id: "nineties",  label: "90's",       tagline: "GeoCities nostalgia",   preview: "💾", accent: "border-teal-400 bg-teal-50 text-teal-700",        available: false },
];

// ─── Shared helpers ───────────────────────────────────────────────────────

const AVATAR_STYLES = [
  { id: "adventurer", label: "Adventurer" },
  { id: "lorelei",    label: "Lorelei"    },
  { id: "micah",      label: "Micah"      },
  { id: "notionists", label: "Notionists" },
];

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=50`;
}

function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
        <Icon size={14} className="text-white" />
      </div>
      <h2 className="text-lg font-black text-gray-900">{label}</h2>
      <div className="flex-1 h-px bg-gray-200 ml-1" />
    </div>
  );
}

// ─── Template selector bar ────────────────────────────────────────────────

function TemplateSelector({ active, onChange, onReset, onPrint }: {
  active: TemplateId;
  onChange: (id: TemplateId) => void;
  onReset: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 overflow-x-auto print:hidden">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">Style</span>

      <div className="flex gap-2 flex-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => t.available && onChange(t.id)}
            title={t.available ? t.tagline : "Coming soon"}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
              active === t.id && t.available
                ? t.accent + " shadow-sm"
                : t.available
                ? "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                : "border-gray-100 text-gray-300 cursor-not-allowed opacity-60"
            }`}
          >
            <span>{t.preview}</span>
            <span>{t.label}</span>
            {!t.available && <Lock size={10} className="opacity-50" />}
            {active === t.id && t.available && (
              <motion.div layoutId="template-pill" className="absolute inset-0 rounded-xl ring-2 ring-current ring-offset-1 opacity-40 pointer-events-none" />
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2 shrink-0 ml-auto">
        <button onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Download size={13} /> Export PDF
        </button>
        <button onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <RefreshCw size={13} /> New CV
        </button>
      </div>
    </div>
  );
}

// ─── Coming-soon placeholder ──────────────────────────────────────────────

function ComingSoonTemplate({ label, tagline, preview }: { label: string; tagline: string; preview: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        <div className="text-7xl mb-4">{preview}</div>
        <h2 className="text-2xl font-black text-gray-800 mb-1">{label}</h2>
        <p className="text-gray-400 text-sm mb-4">{tagline}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium">
          <Lock size={13} />
          Coming soon
        </div>
        <p className="text-xs text-gray-400 mt-4 max-w-xs mx-auto">
          This template is being designed. Switch back to Basic to see your portfolio.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Avatar picker ────────────────────────────────────────────────────────

function AvatarPicker({ profile, style, onStyleChange, className = "" }: {
  profile: Profile; style: string; onStyleChange: (s: string) => void; className?: string;
}) {
  const seed = profile.name || "user";
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100">
        {profile.photo ? (
          <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
        ) : (
          <img src={dicebearUrl(style, seed)} alt="avatar" className="w-full h-full" />
        )}
      </div>
      {!profile.photo && (
        <div className="flex gap-1 flex-wrap justify-center">
          {AVATAR_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStyleChange(s.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                style === s.id
                  ? "border-white text-white bg-white/20"
                  : "border-white/30 text-white/60 hover:text-white hover:border-white/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BASIC template ───────────────────────────────────────────────────────

function BasicTemplate({ profile }: { profile: Profile }) {
  const [avatarStyle, setAvatarStyle] = useState("adventurer");

  const socialLinks = [
    profile.linkedin && { label: "LinkedIn", url: profile.linkedin, icon: Linkedin },
    profile.github   && { label: "GitHub",   url: profile.github,   icon: Github   },
    profile.website  && { label: "Website",  url: profile.website,  icon: Globe    },
  ].filter(Boolean) as { label: string; url: string; icon: React.ElementType }[];

  const extraLinks = profile.links?.filter(
    (l) => l && !socialLinks.some((sl) => sl.url === l)
  ) ?? [];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-gray-900 via-brand-900 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(#fff2 1px,transparent 1px),linear-gradient(90deg,#fff2 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="max-w-4xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-center gap-8">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <AvatarPicker profile={profile} style={avatarStyle} onStyleChange={setAvatarStyle} />
          </motion.div>
          <div className="text-center sm:text-left">
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-4xl font-black leading-tight">
              {profile.name || "Your Name"}
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-brand-300 text-lg font-semibold mt-1">{profile.title}</motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4 text-sm text-white/70">
              {profile.location && <span className="flex items-center gap-1"><MapPin size={13} />{profile.location}</span>}
              {profile.email    && <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-white transition-colors"><Mail size={13} />{profile.email}</a>}
              {profile.phone    && <span className="flex items-center gap-1"><Phone size={13} />{profile.phone}</span>}
            </motion.div>
            {socialLinks.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {socialLinks.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors">
                    <l.icon size={13} />{l.label}<ExternalLink size={10} className="opacity-60" />
                  </a>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {profile.summary && (
          <FadeIn>
            <SectionHeader icon={Star} label="About" />
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-700 leading-relaxed">{profile.summary}</p>
            </div>
          </FadeIn>
        )}

        {profile.skills?.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={Code2} label="Skills" />
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s, i) => (
                <motion.span key={s}
                  initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 transition-colors">
                  {s}
                </motion.span>
              ))}
            </div>
          </FadeIn>
        )}

        {profile.experience?.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={Briefcase} label="Experience" />
            <div className="space-y-4">
              {profile.experience.map((exp, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-purple-500 rounded-l-2xl" />
                  <div className="pl-3">
                    <div className="flex flex-wrap justify-between gap-2 mb-1">
                      <div>
                        <p className="font-bold text-gray-800">{exp.role}</p>
                        <p className="text-brand-600 font-semibold text-sm">{exp.company}
                          {exp.location && <span className="text-gray-400 font-normal ml-2">· {exp.location}</span>}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0">
                        {exp.start}{exp.end ? ` – ${exp.end}` : ""}
                      </span>
                    </div>
                    {exp.bullets?.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {exp.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2 text-sm text-gray-600">
                            <ChevronRight size={14} className="text-brand-400 shrink-0 mt-0.5" />{b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        )}

        {profile.projects?.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={Code2} label="Projects" />
            <div className="grid sm:grid-cols-2 gap-4">
              {profile.projects.map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="font-bold text-gray-800">{p.name}</p>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="text-brand-500 hover:text-brand-700 shrink-0 transition-colors">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.description}</p>
                  {p.tech?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tech.map((t) => (
                        <span key={t} className="text-[11px] px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full border border-brand-100 font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </FadeIn>
        )}

        {profile.education?.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={GraduationCap} label="Education" />
            <div className="space-y-3">
              {profile.education.map((ed, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-800">{ed.institution}</p>
                    <p className="text-sm text-brand-600">{ed.degree}{ed.field ? ` in ${ed.field}` : ""}</p>
                    {ed.grade && <p className="text-xs text-gray-400 mt-0.5">Grade: {ed.grade}</p>}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg self-start">
                    {ed.start}{ed.end ? ` – ${ed.end}` : ""}
                  </span>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        )}

        {profile.certifications?.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={Award} label="Certifications" />
            <div className="flex flex-wrap gap-2">
              {profile.certifications.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-full text-sm shadow-sm">
                  🏆 {c}
                </span>
              ))}
            </div>
          </FadeIn>
        )}

        {extraLinks.length > 0 && (
          <FadeIn delay={0.05}>
            <SectionHeader icon={ExternalLink} label="Links & References" />
            <div className="flex flex-wrap gap-2">
              {extraLinks.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-colors shadow-sm">
                  <Globe size={13} className="shrink-0" />
                  {l.replace(/^https?:\/\//, "").slice(0, 45)}{l.length > 50 ? "…" : ""}
                  <ExternalLink size={10} className="shrink-0 opacity-60" />
                </a>
              ))}
            </div>
          </FadeIn>
        )}

        {profile.languages?.length > 0 && (
          <FadeIn delay={0.05}>
            <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
              Languages: {profile.languages.join(" · ")}
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

// ─── CREATIVE template ────────────────────────────────────────────────────

const CREATIVE_PALETTE = [
  "from-violet-600 to-purple-700",
  "from-pink-600 to-rose-600",
  "from-indigo-600 to-blue-700",
  "from-amber-500 to-orange-600",
  "from-teal-600 to-emerald-700",
];

function SkillBar({ skill, index }: { skill: string; index: number }) {
  const seed = skill.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pct  = 55 + (seed % 45); // deterministic 55–99 %
  const color = ["bg-violet-500", "bg-pink-500", "bg-indigo-500", "bg-amber-500", "bg-teal-500"][index % 5];
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800">{skill}</span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: index * 0.04, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function CreativeSection({ num, label, children, className = "" }: {
  num: string; label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={`relative ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-5xl font-black text-gray-100 select-none leading-none">{num}</span>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{label}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function CreativeTemplate({ profile }: { profile: Profile }) {
  const [avatarStyle, setAvatarStyle] = useState("micah");

  const socialLinks = [
    profile.linkedin && { label: "LinkedIn", url: profile.linkedin, icon: Linkedin },
    profile.github   && { label: "GitHub",   url: profile.github,   icon: Github   },
    profile.website  && { label: "Website",  url: profile.website,  icon: Globe    },
  ].filter(Boolean) as { label: string; url: string; icon: React.ElementType }[];

  const extraLinks = profile.links?.filter(
    (l) => l && !socialLinks.some((sl) => sl.url === l)
  ) ?? [];

  const seed = profile.name || "user";

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative bg-gray-950 text-white overflow-hidden min-h-[420px] flex items-end">
        {/* animated gradient orbs */}
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-violet-600/30 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-10 right-0 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-0 left-1/2 w-64 h-64 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none"
        />

        {/* content */}
        <div className="relative max-w-5xl mx-auto w-full px-8 pb-14 pt-20 grid lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-violet-400 font-mono text-sm tracking-[0.3em] mb-3 uppercase">
                {profile.title || "Portfolio"}
              </p>
              <h1 className="text-6xl lg:text-7xl font-black leading-[0.9] mb-6 tracking-tight">
                {(profile.name || "Your Name").split(" ").map((word, i) => (
                  <motion.span key={i} className="block"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}>
                    {word}
                  </motion.span>
                ))}
              </h1>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-4 text-sm text-gray-400"
              >
                {profile.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-violet-400" />{profile.location}</span>}
                {profile.email    && <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors"><Mail size={13} className="text-violet-400" />{profile.email}</a>}
                {profile.phone    && <span className="flex items-center gap-1.5"><Phone size={13} className="text-violet-400" />{profile.phone}</span>}
              </motion.div>

              {socialLinks.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="flex flex-wrap gap-2 mt-5">
                  {socialLinks.map((l) => (
                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 border border-gray-700 hover:border-violet-500 hover:bg-violet-500/10 rounded-full text-xs font-medium transition-all duration-200">
                      <l.icon size={12} className="text-violet-400" />{l.label}
                    </a>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Avatar — overlaps into content below */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="self-end mb-[-48px] shrink-0 hidden lg:block"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 translate-x-2 translate-y-2" />
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-4 border-gray-950 bg-gray-900">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={dicebearUrl(avatarStyle, seed)} alt="avatar" className="w-full h-full" />
                )}
              </div>
            </div>
            {!profile.photo && (
              <div className="flex gap-1 flex-wrap justify-center mt-3">
                {AVATAR_STYLES.map((s) => (
                  <button key={s.id} onClick={() => setAvatarStyle(s.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-all ${
                      avatarStyle === s.id ? "border-violet-400 text-violet-400" : "border-gray-700 text-gray-600 hover:text-gray-400"
                    }`}>{s.label}</button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 pt-16 pb-20 space-y-20">

        {/* About */}
        {profile.summary && (
          <CreativeSection num="01" label="About Me">
            <div className="relative pl-6 border-l-4 border-violet-500">
              <p className="text-xl text-gray-700 leading-relaxed font-light italic">
                "{profile.summary}"
              </p>
            </div>
          </CreativeSection>
        )}

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <CreativeSection num="02" label="Skills">
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-4">
              {profile.skills.map((s, i) => <SkillBar key={s} skill={s} index={i} />)}
            </div>
          </CreativeSection>
        )}

        {/* Experience */}
        {profile.experience?.length > 0 && (
          <CreativeSection num="03" label="Experience">
            <div className="space-y-8">
              {profile.experience.map((exp, i) => {
                const grad = CREATIVE_PALETTE[i % CREATIVE_PALETTE.length];
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                    className="group grid lg:grid-cols-[200px_1fr] gap-6"
                  >
                    {/* Left col: company + dates */}
                    <div className="lg:text-right">
                      <div className={`inline-block bg-gradient-to-br ${grad} text-white text-xs font-bold px-3 py-1.5 rounded-full mb-2`}>
                        {exp.company}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">
                        {exp.start}{exp.end ? ` → ${exp.end}` : " → Present"}
                      </p>
                      {exp.location && <p className="text-xs text-gray-400 mt-0.5">{exp.location}</p>}
                    </div>

                    {/* Right col: role + bullets */}
                    <div className="border-l-2 border-gray-100 group-hover:border-violet-300 pl-6 transition-colors">
                      <p className="font-black text-gray-900 text-lg leading-tight mb-3">{exp.role}</p>
                      {exp.bullets?.length > 0 && (
                        <ul className="space-y-2">
                          {exp.bullets.map((b, j) => (
                            <li key={j} className="flex gap-2 text-sm text-gray-600">
                              <span className="text-violet-400 mt-1 shrink-0">▸</span>{b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CreativeSection>
        )}

        {/* Projects */}
        {profile.projects?.length > 0 && (
          <CreativeSection num="04" label="Projects">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.projects.map((p, i) => {
                const grad = CREATIVE_PALETTE[i % CREATIVE_PALETTE.length];
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                    whileHover={{ y: -5, transition: { duration: 0.15 } }}
                    className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm group"
                  >
                    {/* gradient header */}
                    <div className={`h-16 bg-gradient-to-br ${grad} flex items-end p-3`}>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          className="ml-auto bg-white/20 hover:bg-white/30 text-white rounded-lg p-1.5 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    <div className="p-4 bg-white">
                      <p className="font-bold text-gray-900 mb-1">{p.name}</p>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{p.description}</p>
                      {p.tech?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {p.tech.map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full font-mono">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CreativeSection>
        )}

        {/* Education */}
        {profile.education?.length > 0 && (
          <CreativeSection num="05" label="Education">
            <div className="flex flex-wrap gap-4">
              {profile.education.map((ed, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex-1 min-w-[220px] bg-gray-950 text-white rounded-2xl p-5"
                >
                  <p className="text-violet-400 font-mono text-xs mb-2">
                    {ed.start}{ed.end ? ` – ${ed.end}` : ""}
                  </p>
                  <p className="font-black text-lg leading-tight">{ed.institution}</p>
                  <p className="text-gray-400 text-sm mt-1">{ed.degree}{ed.field ? ` · ${ed.field}` : ""}</p>
                  {ed.grade && <p className="text-xs text-gray-600 mt-1">{ed.grade}</p>}
                </motion.div>
              ))}
            </div>
          </CreativeSection>
        )}

        {/* Certifications + Extra links */}
        {(profile.certifications?.length > 0 || extraLinks.length > 0) && (
          <CreativeSection num="06" label="More">
            {profile.certifications?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.certifications.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-sm font-medium">
                    🏆 {c}
                  </span>
                ))}
              </div>
            )}
            {extraLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {extraLinks.map((l, i) => (
                  <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-violet-400 hover:bg-violet-50 rounded-xl text-sm text-gray-600 hover:text-violet-700 transition-all">
                    <Globe size={12} className="shrink-0" />
                    {l.replace(/^https?:\/\//, "").slice(0, 40)}{l.length > 45 ? "…" : ""}
                    <ExternalLink size={10} className="shrink-0 opacity-60" />
                  </a>
                ))}
              </div>
            )}
          </CreativeSection>
        )}

        {profile.languages?.length > 0 && (
          <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-6">
            {profile.languages.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Portfolio shell (selector + active template) ─────────────────────────

function PortfolioShell({ profile, onReset }: { profile: Profile; onReset: () => void }) {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("basic");

  const current = TEMPLATES.find((t) => t.id === activeTemplate)!;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TemplateSelector
        active={activeTemplate}
        onChange={setActiveTemplate}
        onReset={onReset}
        onPrint={() => window.print()}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTemplate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex overflow-hidden"
        >
          {activeTemplate === "basic" ? (
            <BasicTemplate profile={profile} />
          ) : activeTemplate === "creative" ? (
            <CreativeTemplate profile={profile} />
          ) : (
            <ComingSoonTemplate
              label={current.label}
              tagline={current.tagline}
              preview={current.preview}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Upload screen ────────────────────────────────────────────────────────

function UploadScreen({ onParsed, log }: {
  onParsed: (p: Profile) => void;
  log: ReturnType<typeof useProcess>["log"];
}) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const CYCLING = [
    "Reading your CV…", "Extracting experience…", "Finding links…",
    "Detecting skills…", "Building your profile…", "Almost done…",
  ];
  const [cycleIdx, setCycleIdx] = useState(0);

  const process = async (file: File) => {
    setLoading(true);
    setError(null);
    const kb = (file.size / 1024).toFixed(0);
    const t0 = Date.now();

    log("PORTFOLIO", `Uploading: ${file.name} (${kb} KB)`, "info");

    const steps: [number, string][] = [
      [1200,  "Extracting text with pdfplumber…"],
      [3000,  "Scanning for embedded photos…"],
      [5500,  "Sending to LLM for structured parsing…"],
      [9000,  "Extracting skills, experience, projects…"],
      [13000, "Detecting links and certifications…"],
      [18000, "Finalising profile…"],
    ];
    const timers = steps.map(([ms, msg]) =>
      setTimeout(() => log("PORTFOLIO", msg, "running"), ms)
    );

    let i = 0;
    const cycleTimer = setInterval(() => { i = (i + 1) % CYCLING.length; setCycleIdx(i); }, 2000);

    try {
      const profile = await parsePortfolio(file) as Profile;
      timers.forEach(clearTimeout);

      const name     = profile.name             || "Unknown";
      const skills   = profile.skills?.length   ?? 0;
      const jobs     = profile.experience?.length ?? 0;
      const projects = profile.projects?.length  ?? 0;
      const elapsed  = ((Date.now() - t0) / 1000).toFixed(1);

      log("PORTFOLIO", `Parsed: ${name}`, "success");
      log("PORTFOLIO", `${skills} skills · ${jobs} jobs · ${projects} projects`, "info");
      if (profile.photo) log("PORTFOLIO", "Embedded photo extracted", "info");
      else               log("PORTFOLIO", `Avatar: DiceBear (${profile.gender ?? "unknown"} seed)`, "info");
      log("PORTFOLIO", `Done in ${elapsed}s`, "success");

      onParsed(profile);
    } catch (err) {
      timers.forEach(clearTimeout);
      const msg = err instanceof Error ? err.message : "Parse failed";
      log("PORTFOLIO", `Error: ${msg}`, "error");
      setError(msg);
    } finally {
      clearInterval(cycleTimer);
      setLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process(file);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-brand-50/30">
      <div className="max-w-lg w-full text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">CV → Portfolio</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Upload your PDF resume and we'll transform it into a beautiful,
            interactive portfolio page — with links, avatar, and animations.
          </p>

          {/* Style previews */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {TEMPLATES.map((t) => (
              <div key={t.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                  t.available ? "border-gray-200 text-gray-600" : "border-gray-100 text-gray-300"
                }`}>
                {t.preview} {t.label}
                {!t.available && <Lock size={9} className="opacity-40" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="border-2 border-brand-200 bg-brand-50 rounded-2xl p-10 flex flex-col items-center gap-4">
                <div className="relative w-14 h-14">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-transparent"
                    style={{ borderTopColor: "#4f6ef7", borderRightColor: "#818cf8" }} />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-1.5 rounded-full border-2 border-transparent"
                    style={{ borderTopColor: "#f97316", borderLeftColor: "#fb923c" }} />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-500" />
                  </motion.div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={cycleIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="text-sm font-medium text-brand-600">
                    {CYCLING[cycleIdx]}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-gray-400">This may take 15–30 seconds</p>
              </motion.div>
            ) : (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
                  dragging ? "border-brand-400 bg-brand-50" : "border-gray-300 hover:border-brand-300 hover:bg-gray-50"
                }`}>
                <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700">Drop your PDF here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse · PDF only · max 10 MB</p>
                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-red-500">
              {error}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export function PortfolioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { log } = useProcess();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">CV → Portfolio</h2>
        <p className="text-xs text-gray-400">Upload your PDF resume · choose a style · share your story</p>
      </header>

      <AnimatePresence mode="wait">
        {!profile ? (
          <motion.div key="upload" className="flex-1 flex overflow-hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadScreen onParsed={setProfile} log={log} />
          </motion.div>
        ) : (
          <motion.div key="portfolio" className="flex-1 flex overflow-hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PortfolioShell profile={profile} onReset={() => setProfile(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
