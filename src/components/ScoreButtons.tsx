import { cn } from "@/lib/utils"
import type { Score } from "@/utils/models"

export default function ScoreButtons(props: { value?: Score; onChange: (v: Score) => void }) {
  const options: Score[] = [1, 2, 3, 4, 5]

  const activeClasses = (score: Score) => {
    if (score === 1) return "bg-red-600 text-white"
    if (score === 2) return "bg-orange-500 text-white"
    if (score === 3) return "bg-zinc-700 text-white"
    if (score === 4) return "bg-blue-600 text-white"
    return "bg-emerald-600 text-white"
  }

  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
      {options.map((score) => {
        const active = props.value === score
        return (
          <button
            key={score}
            type="button"
            onClick={() => props.onChange(score)}
            className={cn(
              "h-8 w-10 rounded-md text-sm font-medium transition-colors",
              active ? `${activeClasses(score)} shadow-sm` : "text-zinc-700 hover:bg-zinc-100"
            )}
          >
            {score}
          </button>
        )
      })}
    </div>
  )
}
