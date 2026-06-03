import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { api } from '~/lib/api'
import { useApi } from '~/lib/useApi'
import { Button, LoadingState, EmptyState } from '~/components/ui'
import { SkillDetailView } from '~/components/SkillDetail'

export const Route = createFileRoute('/skills/$skillId')({
  component: SkillDetailPage,
})

function SkillDetailPage() {
  const { skillId } = Route.useParams()
  const navigate = useNavigate()
  const registry = useApi(api.registry)
  const skill = registry.data?.skills?.find((s: any) => s.name === skillId)

  return (
    <div className="space-y-6 gp-fade-in">
      <button
        onClick={() => navigate({ to: '/skills' })}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        data-testid="skill-back"
      >
        <ArrowLeft size={15} /> Back to registry
      </button>

      {registry.loading ? (
        <LoadingState label="Loading skill…" />
      ) : !skill ? (
        <EmptyState
          title="Skill not found"
          body={`No skill named "${skillId}" in the registry.`}
          actions={<Link to="/skills"><Button>Back to registry</Button></Link>}
        />
      ) : (
        <div className="mx-auto max-w-6xl gp-glass-panel p-6 gp-radial-glow gp-radial-glow-violet">
          <SkillDetailView skill={skill} />
        </div>
      )}
    </div>
  )
}
