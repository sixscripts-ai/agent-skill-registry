import { createFileRoute } from '@tanstack/react-router'
import { Wand2, Pencil } from 'lucide-react'
import { PageHeader } from '~/components/ui'
import { SkillBuilder } from '~/components/SkillBuilder'

export const Route = createFileRoute('/builder')({
  component: BuilderPage,
  validateSearch: (search: Record<string, string | undefined>): { edit?: string } => ({
    edit: search.edit || undefined,
  }),
})

function BuilderPage() {
  const { edit } = Route.useSearch()
  return (
    <div className="space-y-7 gp-fade-in">
      <PageHeader
        icon={edit ? Pencil : Wand2}
        eyebrow={edit ? 'Edit mode' : 'Compose'}
        title={edit ? `Edit "${edit}"` : 'Skill Builder'}
        description={
          edit
            ? `Editing skill "${edit}". Changes are upserted — the name acts as the unique key.`
            : 'Design, validate, and activate a portable SKILL.md package for your universal registry. Move it through the lifecycle: draft → quarantined → validated → active.'
        }
      />
      <SkillBuilder editName={edit} />
    </div>
  )
}
