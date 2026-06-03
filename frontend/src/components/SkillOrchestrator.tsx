import { useState } from 'react'
import { Reorder, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Trash2, 
  GripVertical, 
  Sparkles,
  Terminal,
  Plus,
  CheckCircle2,
  XCircle
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
  const [initialPrompt, setInitialPrompt] = useState('')
  const [running, setRunning] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [result, setResult] = useState<any>(null)
  const toast = useToast()

  const skills = registry.data?.skills || []

  const handleAdd = (skill: any) => {
    setPipeline(prev => [...prev, { instanceId: Math.random().toString(36).substring(2, 9), skill }])
    toast(`Added ${skill.name} to pipeline`, 'cyan')
    setResult(null) // Clear previous result on pipeline change
  }

  const handleRemove = (instanceId: string) => {
    setPipeline(prev => prev.filter(p => p.instanceId !== instanceId))
    setResult(null)
  }

  const handleExecute = async () => {
    if (pipeline.length === 0) return
    setRunning(true)
    setResult(null)
    toast('Executing multi-skill pipeline...', 'violet')
    
    try {
      const payload = {
        pipeline: pipeline.map(n => ({ skillName: n.skill.name })),
        initialPrompt,
        activeMcps: [] // Could be wired to active MCP settings later
      }

      const res = await fetch('http://localhost:8000/api/skills/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      setResult(data)
      
      if (data.ok) {
        toast('Pipeline execution completed successfully', 'emerald')
      } else {
        toast('Pipeline execution failed at some step', 'rose')
      }
    } catch (err: any) {
      toast(err.message || 'Error running pipeline', 'rose')
    } finally {
      setRunning(false)
    }
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
      <div className="flex-1 overflow-y-auto pb-20 pt-4 px-1 gp-custom-scrollbar">
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Initial Prompt Context</label>
          <textarea
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            placeholder="Describe the overarching task. This will be passed to the first skill in the chain..."
            className="w-full h-24 bg-[#0a0a0f]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all resize-none shadow-inner"
          />
        </div>

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

        {/* Results Panel */}
        {result && (
          <div className="mt-8 gp-panel p-6 border-white/10 bg-black/40 shadow-inner">
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              {result.ok ? <CheckCircle2 className="text-emerald-400" size={18} /> : <XCircle className="text-rose-400" size={18} />}
              Pipeline Execution Report
            </h4>
            <div className="space-y-6">
              {result.steps?.map((step: any) => (
                <div key={step.stepIndex} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-white/[0.05] pb-3">
                    <span className="font-mono text-xs text-cyan-400 font-semibold">Step {step.stepIndex}: {step.skillName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${step.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {step.ok ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto gp-custom-scrollbar pr-2">
                    {step.output}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
