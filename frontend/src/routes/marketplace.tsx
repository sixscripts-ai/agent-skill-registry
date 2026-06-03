import { createFileRoute } from '@tanstack/react-router'
import { SkillMarketplace } from '~/components/SkillMarketplace'

export const Route = createFileRoute('/marketplace')({
  component: MarketplacePage,
})

function MarketplacePage() {
  return (
    <div className="h-full w-full overflow-hidden flex flex-col relative z-0">
      <SkillMarketplace />
    </div>
  )
}
