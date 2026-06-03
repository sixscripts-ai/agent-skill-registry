import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { TierBadge } from '~/components/ui'

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  skills: any[];
  onSelect: (skill: any) => void;
}

export function CommandPalette({ open, setOpen, skills, onSelect }: CommandPaletteProps) {
  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-2xl bg-[#0a0a0f]/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative z-50"
          >
            <Command 
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
              }}
            >
              <div className="flex items-center px-4 border-b border-white/[0.08]">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <Command.Input 
                  autoFocus
                  placeholder="Search skills to add to pipeline... (e.g. 'frontend')"
                  className="w-full h-14 bg-transparent text-white placeholder-slate-500 focus:outline-none font-medium text-lg"
                />
                <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-white/[0.05] border border-white/10 ml-2">
                  <span className="text-xs font-mono text-slate-400">esc</span>
                </div>
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto gp-custom-scrollbar p-2">
                <Command.Empty className="py-6 text-center text-sm text-slate-500">
                  No skills found. Try a different search.
                </Command.Empty>
                
                {skills.length > 0 && (
                  <Command.Group heading="Available Skills" className="text-xs font-semibold text-slate-500 px-2 py-2">
                    {skills.map((skill) => (
                      <Command.Item
                        key={skill.name}
                        value={`${skill.name} ${skill.description}`}
                        onSelect={() => {
                          onSelect(skill)
                          setOpen(false)
                        }}
                        className="group flex items-center justify-between px-3 py-3 mt-1 rounded-xl cursor-pointer hover:bg-white/[0.05] data-[selected=true]:bg-cyan-500/10 data-[selected=true]:text-cyan-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-cyan-400 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
                            <span className="font-semibold text-slate-200">{skill.name}</span>
                            <TierBadge tier={skill.tier} />
                          </div>
                          <p className="text-sm text-slate-400 truncate pl-6">{skill.description}</p>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
