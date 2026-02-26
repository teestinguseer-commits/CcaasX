/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  RefreshCw, 
  Search, 
  Calendar, 
  ExternalLink, 
  BrainCircuit, 
  TrendingUp, 
  MessageSquareQuote,
  Loader2,
  ChevronRight,
  History,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  LayoutDashboard,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Logo } from './components/Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BriefItem {
  headline: string;
  source: string;
  url: string;
  summary: string;
  tags: string[];
}

interface ProductOpportunity {
  id: number;
  feature_name: string;
  description: string;
  why_build_it: string;
  competitor_activity: string;
}

interface BriefSection {
  title: string;
  items: BriefItem[];
}

interface BriefData {
  date: string;
  executive_summary: string;
  top_10_opportunities?: ProductOpportunity[];
  sections: BriefSection[];
}

interface BriefRecord {
  id: number;
  date: string;
  content: BriefData | string; // Handle both parsed object and JSON string
  created_at: string;
}

interface BattlecardData {
  threat_level: "Low" | "Medium" | "High";
  sprinklr_advantage: string;
  kill_points: string[];
  elevator_pitch: string;
}

interface ResearchData {
  summary: string;
  key_findings: string[];
  competitor_landscape: string;
  links: { title: string; url: string }[];
}

export default function App() {
  const [currentBrief, setCurrentBrief] = useState<BriefData | null>(null);
  const [history, setHistory] = useState<BriefRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchLatestBrief();
    fetchHistory();
  }, []);

  const safeFetch = async (url: string, options?: RequestInit, retries = 3) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || errData.details || `Request failed with status ${res.status}`);
        }
        return res.json();
      } else {
        const text = await res.text();
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return safeFetch(url, options, retries - 1);
        }
        throw new Error(`Server not ready or endpoint not found`);
      }
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return safeFetch(url, options, retries - 1);
      }
      throw error;
    }
  };

  const fetchLatestBrief = async () => {
    try {
      const data = await safeFetch('/api/briefs/latest');
      if (data) {
        const parsedContent = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        setCurrentBrief(parsedContent || data); 
      }
    } catch (err) {
      console.error("Error fetching latest brief:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await safeFetch('/api/briefs');
      setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const generateBrief = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await safeFetch('/api/generate-brief', { method: 'POST' });
      setCurrentBrief(data);
      fetchHistory();
      setView('dashboard');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (record: BriefRecord) => {
    const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;
    setCurrentBrief(content);
    setView('dashboard');
  };

  return (
    <div className="flex h-screen bg-[var(--color-canvas)] text-stone-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#FAFAFA] border-r border-[var(--color-border)] flex flex-col transition-transform duration-300 ease-in-out",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className={cn("font-bold text-lg tracking-tight text-stone-900 transition-opacity duration-200", !isSidebarOpen && "lg:hidden")}>
              Seeker
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')}
              collapsed={!isSidebarOpen}
            />
            <NavItem 
              icon={<History size={20} />} 
              label="History" 
              active={view === 'history'} 
              onClick={() => setView('history')}
              collapsed={!isSidebarOpen}
            />
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-border)]">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)] flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-stone-500">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-stone-800">
              {view === 'dashboard' ? 'Daily Brief' : 'Brief History'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={generateBrief}
              disabled={isLoading}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              <span>{isLoading ? 'Generating...' : 'Generate New Brief'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 shadow-sm"
                >
                  <div className="p-2 bg-red-100 rounded-full">
                    <ShieldAlert size={16} />
                  </div>
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}

              {view === 'history' ? (
                <HistoryView history={history} onLoad={loadFromHistory} />
              ) : currentBrief ? (
                <BriefDisplay brief={currentBrief} />
              ) : (
                <EmptyState onGenerate={generateBrief} isLoading={isLoading} />
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick, collapsed = false }: { icon: ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative",
        active 
          ? "bg-stone-100 text-stone-900 font-medium shadow-sm border border-stone-200/50" 
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
      )}
    >
      <span className={cn("transition-colors", active ? "text-stone-900" : "text-stone-400 group-hover:text-stone-600")}>
        {icon}
      </span>
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}



function HistoryView({ history, onLoad }: { history: BriefRecord[], onLoad: (record: BriefRecord) => void }) {
  return (
    <motion.div 
      key="history-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-stone-900">Brief History</h2>
        <div className="text-sm text-stone-500">
          {history.length} {history.length === 1 ? 'record' : 'records'} found
        </div>
      </div>
      
      <div className="card-base overflow-hidden">
        {history.length === 0 ? (
          <div className="p-16 text-center text-stone-500 flex flex-col items-center gap-4">
            <div className="p-4 bg-stone-50 rounded-full border border-stone-100">
              <History className="text-stone-300" size={32} />
            </div>
            <div>
              <p className="font-medium text-stone-900">No history available yet</p>
              <p className="text-sm mt-1">Generate your first brief to see it here.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            <div className="bg-stone-50/50 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-[var(--color-border)]">
              <div className="col-span-3">Date</div>
              <div className="col-span-8">Summary</div>
              <div className="col-span-1"></div>
            </div>
            {history.map((record) => {
               const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;
               return (
                <button 
                  key={record.id}
                  onClick={() => onLoad(record)}
                  className="w-full text-left px-6 py-4 hover:bg-stone-50 transition-colors grid grid-cols-12 gap-4 items-center group"
                >
                  <div className="col-span-3">
                    <div className="font-medium text-stone-900">{record.date}</div>
                    <div className="text-xs text-stone-400 font-mono mt-1">
                      {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="col-span-8">
                    <p className="text-sm text-stone-600 line-clamp-2 group-hover:text-stone-900 transition-colors">
                      {content.executive_summary}
                    </p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight className="text-stone-300 group-hover:text-stone-500 transition-colors" size={16} />
                  </div>
                </button>
               );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BattlecardModal({ item, onClose }: { item: BriefItem, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BattlecardData | null>(null);

  useEffect(() => {
    fetch('/api/analyze-competitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: item.headline,
        summary: item.summary,
        source: item.source
      })
    })
    .then(res => res.json())
    .then(setData)
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [item]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-start bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-stone-200">
                Competitive Battlecard
              </span>
              {data && (
                <span className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
                  data.threat_level === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 
                  data.threat_level === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                  'bg-emerald-50 text-emerald-700 border-emerald-100'
                )}>
                  Threat: {data.threat_level}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-stone-900 leading-tight mb-2">{item.headline}</h3>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Newspaper size={14} />
              <span>{item.source}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
              <Loader2 className="animate-spin mb-3 text-stone-500" size={32} />
              <p className="text-sm font-medium">Analyzing competitor threat...</p>
            </div>
          ) : data ? (
            <div className="space-y-8">
              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <Target size={16} className="text-emerald-600" />
                  Sprinklr Advantage
                </h4>
                <div className="card-base p-5 text-stone-700 leading-relaxed text-sm">
                  {data.sprinklr_advantage}
                </div>
              </section>

              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <Zap size={16} className="text-amber-500" />
                  Kill Points
                </h4>
                <div className="space-y-3">
                  {data.kill_points.map((point, i) => (
                    <div key={i} className="flex gap-4 card-base p-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold border border-amber-100">
                        {i + 1}
                      </div>
                      <p className="text-sm text-stone-700 font-medium pt-0.5">{point}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <MessageSquareQuote size={16} className="text-blue-600" />
                  Elevator Pitch
                </h4>
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 text-blue-900 text-sm italic leading-relaxed relative">
                  <div className="absolute top-4 left-4 text-blue-200">
                    <MessageSquareQuote size={24} />
                  </div>
                  <p className="relative z-10 pl-8">"{data.elevator_pitch}"</p>
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl border border-red-100">
              Failed to load analysis.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ResearchData {
  summary: string;
  key_findings: string[];
  competitor_landscape: string;
  links: { title: string; url: string }[];
}

function ResearchModal({ opportunity, onClose }: { opportunity: ProductOpportunity, onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResearchData | null>(null);

  useEffect(() => {
    fetch('/api/research-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: opportunity.feature_name,
        context: opportunity.description
      })
    })
    .then(res => res.json())
    .then(setData)
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [opportunity]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[var(--color-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-start bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-teal-100">
                Deep Dive Research
              </span>
            </div>
            <h3 className="text-xl font-bold text-stone-900 leading-tight mb-2">{opportunity.feature_name}</h3>
            <p className="text-sm text-stone-500">{opportunity.description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
              <Loader2 className="animate-spin mb-3 text-teal-500" size={32} />
              <p className="text-sm font-medium">Researching market landscape...</p>
            </div>
          ) : data ? (
            <div className="space-y-8">
              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <Sparkles size={16} className="text-teal-500" />
                  Research Summary
                </h4>
                <div className="card-base p-6 text-stone-700 leading-relaxed text-sm">
                  {data.summary}
                </div>
              </section>

              <div className="grid md:grid-cols-2 gap-6">
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                    <TrendingUp size={16} className="text-blue-500" />
                    Key Findings
                  </h4>
                  <ul className="space-y-3">
                    {data.key_findings.map((point, i) => (
                      <li key={i} className="flex gap-3 text-sm text-stone-600 card-base p-3 shadow-none bg-white">
                        <span className="text-blue-500 font-bold">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                    <ShieldAlert size={16} className="text-red-500" />
                    Competitor Landscape
                  </h4>
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-stone-700 text-sm leading-relaxed">
                    {data.competitor_landscape}
                  </div>
                </section>
              </div>

              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
                  <ExternalLink size={16} className="text-stone-400" />
                  Sources & References
                </h4>
                <div className="grid gap-3">
                  {data.links.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-teal-300 hover:shadow-md transition-all group"
                    >
                      <span className="text-sm font-medium text-stone-700 group-hover:text-teal-700 truncate">{link.title}</span>
                      <ExternalLink size={14} className="text-stone-400 group-hover:text-teal-400 flex-shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center text-red-500 p-8 bg-red-50 rounded-xl border border-red-100">
              Failed to load research.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductOpportunitiesSection({ opportunities }: { opportunities: ProductOpportunity[] }) {
  const [selectedOpp, setSelectedOpp] = useState<ProductOpportunity | null>(null);

  if (!opportunities || opportunities.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {selectedOpp && (
          <ResearchModal opportunity={selectedOpp} onClose={() => setSelectedOpp(null)} />
        )}
      </AnimatePresence>
      
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-stone-100 text-stone-700 rounded-lg">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Top 10 Opportunities</h2>
            <p className="text-sm text-stone-500">High-impact product bets based on market signals</p>
          </div>
        </div>

        <div className="grid gap-4">
          {opportunities.map((opp, i) => (
            <motion.div 
              key={opp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group card-base p-5 cursor-pointer card-hover border-[var(--color-border)]"
              onClick={() => setSelectedOpp(opp)}
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center font-bold font-mono text-sm group-hover:bg-stone-900 group-hover:text-white transition-colors">
                  {i + 1}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h3 className="font-bold text-base text-stone-900 group-hover:text-teal-700 transition-colors">
                      {opp.feature_name}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      Deep Dive <ArrowRight size={12} />
                    </span>
                  </div>
                  <p className="text-stone-600 text-sm mb-3">{opp.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-stone-500">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <span className="font-medium text-stone-700">Why:</span> {opp.why_build_it}
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-500">
                      <ShieldAlert size={14} className="text-amber-500" />
                      <span className="font-medium text-stone-700">Competitors:</span> {opp.competitor_activity}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}

function BriefDisplay({ brief }: { brief: BriefData }) {
  const [copied, setCopied] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BriefItem | null>(null);

  const copySummary = () => {
    navigator.clipboard.writeText(brief.executive_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      key="brief-display"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-12"
    >
      <AnimatePresence>
        {selectedItem && (
          <BattlecardModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      {/* Executive Summary */}
      <section className="card-base p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">Executive Summary</h2>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Calendar size={14} />
              <span>{brief.date}</span>
            </div>
          </div>
          <button 
            onClick={copySummary}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-[var(--color-border)] hover:border-stone-300"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="prose prose-stone max-w-none">
          <p className="text-lg leading-relaxed text-stone-700">
            {brief.executive_summary}
          </p>
        </div>
      </section>

      {/* Top 10 Opportunities */}
      {brief.top_10_opportunities && (
        <ProductOpportunitiesSection opportunities={brief.top_10_opportunities} />
      )}

      {/* News Sections */}
      <div className="space-y-12">
        {brief.sections.map((section, idx) => (
          <section key={idx}>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xl font-bold text-stone-900">{section.title}</h3>
              <div className="h-px flex-1 bg-stone-200" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {section.items.map((item, itemIdx) => (
                <ArticleCard key={itemIdx} item={item} onAnalyze={() => setSelectedItem(item)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </motion.div>
  );
}

function ArticleCard({ item, onAnalyze }: { item: BriefItem, onAnalyze: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="group card-base p-6 flex flex-col h-full card-hover"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-wider">
          <Newspaper size={12} />
          <span>{item.source}</span>
        </div>
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-stone-400 hover:text-blue-600 transition-colors"
        >
          <ExternalLink size={16} />
        </a>
      </div>
      
      <h4 className="text-lg font-bold text-stone-900 mb-3 leading-snug group-hover:text-blue-700 transition-colors">
        {item.headline}
      </h4>
      
      <p className="text-stone-600 text-sm leading-relaxed mb-6 flex-grow">
        {item.summary}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[10px] font-medium px-2 py-1 bg-stone-100 text-stone-600 rounded-full border border-stone-200">
              {tag}
            </span>
          ))}
        </div>
        
        <button 
          onClick={onAnalyze}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-all"
        >
          <Target size={14} className="text-emerald-600" />
          Analyze Impact
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ onGenerate, isLoading }: { onGenerate: () => void, isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-stone-200 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="relative bg-white p-6 rounded-2xl shadow-xl border border-[var(--color-border)]">
          <div className="p-4 bg-stone-50 rounded-xl mb-4 flex justify-center">
            <Sparkles className="text-stone-400" size={48} />
          </div>
          <div className="flex gap-4 text-xs font-mono text-stone-400">
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-stone-900">15+</span>
              <span>Sources</span>
            </div>
            <div className="w-px bg-stone-200" />
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-stone-900">AI</span>
              <span>Analysis</span>
            </div>
            <div className="w-px bg-stone-200" />
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-stone-900">10</span>
              <span>Insights</span>
            </div>
          </div>
        </div>
      </motion.div>
      
      <h2 className="text-3xl font-bold text-stone-900 mb-3 text-center tracking-tight">
        Ready for your daily download?
      </h2>
      <p className="text-stone-500 text-center max-w-md mb-8 text-lg">
        Generate a comprehensive intelligence brief curated from top industry sources.
      </p>
      
      <button 
        onClick={onGenerate}
        disabled={isLoading}
        className="btn-primary flex items-center gap-2 px-6 py-3 text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
        <span>{isLoading ? 'Analyzing Market Signals...' : 'Generate Intelligence Brief'}</span>
      </button>
    </div>
  );
}



