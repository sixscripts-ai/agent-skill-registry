import { createFileRoute } from '@tanstack/react-router'
import { Workflow } from 'lucide-react'
import { PageHeader } from '~/components/ui'
import { SkillOrchestrator } from '~/components/SkillOrchestrator'

export const Route = createFileRoute('/orchestrator')({
  component: OrchestratorPage,
})

function OrchestratorPage() {
  return (
    <div className="space-y-7 gp-fade-in h-full flex flex-col">
      <PageHeader
        icon={Workflow}
        eyebrow="Advanced Chaining"
        title="Skill Orchestrator"
        description="Drag and drop skills to create a multi-agent execution pipeline. The orchestrator will pass context seamlessly from one skill to the next."
      />
      <div className="flex-1 min-h-0">
        <SkillOrchestrator />
      </div>
    </div>
  )
}
