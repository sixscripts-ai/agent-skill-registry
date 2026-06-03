import { useState } from 'react'
import { Reorder, AnimatePresence, motion } from 'framer-motion'
import { 
  Play, 
  Trash2, 
  GripVertical, 
  Plus, 
  Search,
  Sparkles,
  Wand2,
  Terminal
} from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { TierBadge, StatusBadge, Button, LoadingState, useToast } from '~/components/ui'

type PipelineNode = {
  instanceId: string;
  skill: any;
}

export function SkillOrchestrator() {
  const registry = useApi(() => api.registry(), [])
  const [pipeline, setPipeline] = useState<PipelineNode[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [running, setRunning] = useState(false)
  const toast = useToast()

  const skills = registry.data?.skills || []
  
  const filteredSkills = skills.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = (skill: any) => {
    setPipeline(prev => [...prev, { instanceId: Math.random().toString(36).substring(2, 9), skill }])
    toast(`Added ${skill.name} to pipeline`, 'cyan')
  }

  const handleRemove = (instanceId: string) => {
    setPipeline(prev => prev.filter(p => p.instanceId !== instanceId))
  }

  const handleExecute = async () => {
    if (pipeline.length === 0) return
    setRunning(true)
    toast('Executing multi-skill pipeline...', 'violet')
    
    // Simulate orchestration delay
    setTimeout(() => {
      setRunning(false)
      toast('Pipeline execution completed successfully', 'emerald')
    }, 2000)
  }

  if (registry.loading) return <LoadingState label="Loading skills..." />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      {/* LEFT: Skill Palette */}
      <div className="lg:col-span-5 flex flex-col h-[calc(100vh-10rem)] gp-panel p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto gp-custom-scrollbar pr-2 space-y-2 pb-10">
          {filteredSkills.map((skill: any) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              onClick={() => handleAdd(skill)}
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-200 text-sm truncate">{skill.name}</span>
                  <TierBadge tier={skill.tier} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{skill.description}</p>
              </div>
              <button className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-cyan-500/20 transition-all shrink-0">
                <Plus size={16} />
              </button>
            </motion.div>
          ))}
          {filteredSkills.length === 0 && (
            <div className="text-center py-10 text-sm text-slate-500">No skills found.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Pipeline Builder */}
      <div className="lg:col-span-7 flex flex-col h-[calc(100vh-10rem)] gp-panel p-5 relative overflow-hidden backdrop-blur-xl border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-violet-400" size={18} />
              Execution Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1">Drag to reorder. Context flows sequentially.</p>
          </div>
          
          <Button 
            variant="primary"
            onClick={handleExecute}
            disabled={pipeline.length === 0 || running}
            icon={running ? Terminal : Play}
            className={`shadow-violet-500/20 border-violet-500/30 ${running ? 'animate-pulse' : ''}`}
          >
            {running ? 'Orchestrating...' : 'Run Pipeline'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto gp-custom-scrollbar -mx-2 px-2 pb-10 relative">
          {pipeline.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/[0.05] rounded-2xl m-4 bg-black/20">
              <Wand2 className="text-slate-600 mb-3" size={32} />
              <p className="text-sm font-medium text-slate-400">Pipeline is empty</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Select skills from the left to build a chained orchestration sequence.
              </p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={pipeline} 
              onReorder={setPipeline}
              className="space-y-3"
            >
              <AnimatePresence>
                {pipeline.map((node, index) => (
                  <Reorder.Item
                    key={node.instanceId}
                    value={node}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative bg-[#040406]/90 backdrop-blur border border-white/[0.08] rounded-xl p-4 flex items-center gap-4 group hover:border-white/[0.15] transition-colors"
                  >
                    <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-600 hover:text-slate-300 transition-colors">
                      <GripVertical size={16} />
                    </div>
                    
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.05] text-[10px] font-bold text-slate-400 border border-white/10 shrink-0">
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-200">{node.skill.name}</span>
                        <StatusBadge status={node.skill.status} />
                      </div>
                      <p className="text-xs text-slate-400 truncate">{node.skill.description}</p>
                    </div>

                    <button 
                      onClick={() => handleRemove(node.instanceId)}
                      className="h-8 w-8 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition-all shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>

                    {index < pipeline.length - 1 && (
                      <div className="absolute -bottom-3 left-12 w-[2px] h-3 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                    )}
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  )
}
