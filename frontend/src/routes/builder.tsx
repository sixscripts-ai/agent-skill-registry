import { createFileRoute } from '@tanstack/react-router'
import { Wand2 } from 'lucide-react'
import { PageHeader } from '~/components/ui'
import { SkillBuilder } from '~/components/SkillBuilder'

export const Route = createFileRoute('/builder')({
  component: BuilderPage,
})

function BuilderPage() {
  return (
    <div className="space-y-7 gp-fade-in">
      <PageHeader
        icon={Wand2}
        eyebrow="Compose"
        title="Skill Builder"
        description="Design, validate, and activate a portable SKILL.md package for your universal registry. Move it through the lifecycle: draft → quarantined → validated → active."
      />
      <SkillBuilder />
    </div>
  )
}
