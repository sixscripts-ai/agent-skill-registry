import { useState } from 'react'
import { Reorder, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Trash2, 
  GripVertical, 
  Sparkles,
  Terminal,
  Plus
} from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { TierBadge, StatusBadge, Button, LoadingState, useToast } from '~/components/ui'
import { CommandPalette } from '~/components/CommandPalette'

type PipelineNode = {
  instanceId: string;
  skill: any;
}

export function SkillOrchestrator() {
  const registry = useApi(() => api.registry(), [])
  const [pipeline, setPipeline] = useState<PipelineNode[]>([])
  const [running, setRunning] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const toast = useToast()

  const skills = registry.data?.skills || []

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

  if (registry.loading) return <LoadingState label="Loading registry..." />

  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gp-panel p-5 backdrop-blur-xl border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="text-violet-400" size={18} />
            Execution Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">Sequence of skills. Data flows top to bottom.</p>
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

      {/* Pipeline Editor */}
      <div className="flex-1 overflow-y-auto pb-20 pt-4">
        <Reorder.Group 
          axis="y" 
          values={pipeline} 
          onReorder={setPipeline}
          className="space-y-4"
        >
          <AnimatePresence>
            {pipeline.map((node, index) => (
              <Reorder.Item
                key={node.instanceId}
                value={node}
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative bg-[#040406]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5 flex items-center gap-4 group hover:border-white/[0.15] transition-colors shadow-xl"
              >
                <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-600 hover:text-slate-300 transition-colors">
                  <GripVertical size={16} />
                </div>
                
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.05] text-xs font-bold text-slate-400 border border-white/10 shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-200 text-lg">{node.skill.name}</span>
                    <StatusBadge status={node.skill.status} />
                    <TierBadge tier={node.skill.tier} />
                  </div>
                  <p className="text-sm text-slate-400 truncate">{node.skill.description}</p>
                </div>

                <button 
                  onClick={() => handleRemove(node.instanceId)}
                  className="h-10 w-10 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 flex items-center justify-center transition-all shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>

                {/* Connection Line */}
                {index < pipeline.length - 1 && (
                  <div className="absolute -bottom-4 left-14 w-[2px] h-4 bg-gradient-to-b from-white/[0.15] to-transparent pointer-events-none" />
                )}
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <div className="mt-4 flex flex-col items-center">
          <button 
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-dashed border-white/20 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all font-medium text-sm group"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            Add Skill Node
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-colors">
              ⌘K
            </span>
          </button>
        </div>
      </div>

      <CommandPalette 
        open={cmdOpen} 
        setOpen={setCmdOpen} 
        skills={skills} 
        onSelect={handleAdd} 
      />
    </div>
  )
}
