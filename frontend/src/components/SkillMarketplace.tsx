import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Flame, DownloadCloud, Sparkles, Filter, CheckCircle2 } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { TierBadge, StatusBadge, LoadingState, useToast } from '~/components/ui'
import { TIERS } from '~/lib/meta'

export function SkillMarketplace() {
  const registry = useApi(() => api.registry(), [])
  const [search, setSearch] = useState('')
  const [activeTier, setActiveTier] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<string[]>([])
  const toast = useToast()

  const skills = registry.data?.skills || []

  // Filter skills based on search & tier
  const filteredSkills = useMemo(() => {
    return skills.filter((s: any) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                            s.description.toLowerCase().includes(search.toLowerCase())
      const matchesTier = activeTier ? s.tier === activeTier : true
      return matchesSearch && matchesTier
    })
  }, [skills, search, activeTier])

  // Mock trending skills (randomly select 3)
  const trendingSkills = useMemo(() => {
    if (skills.length === 0) return []
    const shuffled = [...skills].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 3)
  }, [skills])

  const handleInstall = (skill: any) => {
    setInstalling(skill.name)
    // Simulate network delay for installation
    setTimeout(() => {
      setInstalling(null)
      setInstalled(prev => [...prev, skill.name])
      toast(`Successfully installed ${skill.name}`, 'emerald')
    }, 1500)
  }

  if (registry.loading) return <LoadingState label="Loading marketplace..." />

  return (
    <div className="w-full h-full flex flex-col bg-[#040406] overflow-y-auto gp-custom-scrollbar">
      
      {/* Hero Section */}
      <div className="relative w-full overflow-hidden border-b border-white/[0.05] bg-gradient-to-b from-[#0a0a0f] to-[#040406] px-8 pt-12 pb-16 shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-[#040406] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6 tracking-wide">
            <Sparkles size={14} /> COMMUNITY CATALOG
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 drop-shadow-md">
            Discover Advanced <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Agent Skills</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg mb-10 leading-relaxed">
            Enhance your autonomous agents by installing verified, highly-specialized skills directly from the community repository.
          </p>

          <div className="w-full max-w-xl relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, capability, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-14 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner text-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto px-8 py-10 flex gap-8">
        
        {/* Sidebar Filters */}
        <div className="w-64 shrink-0 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Filter size={16} className="text-slate-400" /> Filter by Category
            </h3>
            <div className="flex flex-col gap-1.5">
              <button 
                onClick={() => setActiveTier(null)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTier === null ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'}`}
              >
                All Skills
              </button>
              {TIERS.map(tier => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTier === tier ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'}`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 min-w-0">
          
          {/* Trending Section */}
          {!search && !activeTier && (
            <div className="mb-10">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Flame size={20} className="text-amber-500" /> Trending This Week
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trendingSkills.map((skill: any) => (
                  <SkillCard 
                    key={`trending-${skill.name}`} 
                    skill={skill} 
                    onInstall={handleInstall} 
                    isInstalling={installing === skill.name}
                    isInstalled={installed.includes(skill.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Skills Grid */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {activeTier ? <span className="capitalize">{activeTier} Skills</span> : 'All Skills'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">{filteredSkills.length} results</span>
          </div>

          {filteredSkills.length === 0 ? (
            <div className="w-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <Search className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No skills found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredSkills.map((skill: any) => (
                  <SkillCard 
                    key={`grid-${skill.name}`} 
                    skill={skill} 
                    onInstall={handleInstall}
                    isInstalling={installing === skill.name}
                    isInstalled={installed.includes(skill.name)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function SkillCard({ skill, onInstall, isInstalling, isInstalled }: { skill: any, onInstall: (s: any) => void, isInstalling: boolean, isInstalled: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="gp-panel p-5 border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl flex flex-col h-full hover:border-violet-500/30 hover:shadow-[0_8px_30px_rgb(139,92,246,0.12)] group"
    >
      <div className="flex justify-between items-start mb-3 gap-2">
        <h4 className="font-bold text-slate-200 text-lg truncate" title={skill.name}>{skill.name}</h4>
        <TierBadge tier={skill.tier} />
      </div>
      
      <p className="text-sm text-slate-400 line-clamp-3 mb-5 flex-1 leading-relaxed">
        {skill.description}
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
        <StatusBadge status={skill.status} />
        
        <button
          disabled={isInstalling || isInstalled}
          onClick={() => onInstall(skill)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isInstalled 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : isInstalling
                ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse cursor-wait'
                : 'bg-white/[0.05] text-slate-300 border border-white/10 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30 group-hover:bg-violet-500/10'
          }`}
        >
          {isInstalled ? (
            <><CheckCircle2 size={14} /> Installed</>
          ) : isInstalling ? (
            <><DownloadCloud size={14} className="animate-bounce" /> Installing...</>
          ) : (
            <><DownloadCloud size={14} /> Install</>
          )}
        </button>
      </div>
    </motion.div>
  )
}
