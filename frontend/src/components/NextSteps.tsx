import { useLang } from '../lib/lang-context'
import type { RiskLevel } from '../lib/types'

export default function NextSteps({ level }: { level: RiskLevel }) {
  const { t } = useLang()
  const { title, items } = t.steps[level]

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-normal text-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
