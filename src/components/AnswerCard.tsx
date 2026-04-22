import { Copy } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import ScoreButtons from "@/components/ScoreButtons"
import { cn } from "@/lib/utils"
import { DIMENSIONS, type BlindLabel, type DimensionKey, type Score } from "@/utils/models"

export default function AnswerCard(props: {
  label: BlindLabel
  modelName?: string
  revealModelNames: boolean
  answer: string
  scores: Partial<Record<DimensionKey, Score>>
  note: string
  onScore: (dim: DimensionKey, score: Score) => void
  onNote: (note: string) => void
}) {
  const hasText = props.answer.trim().length > 0
  const copyText = async () => {
    await navigator.clipboard.writeText(props.answer)
  }

  const complete = DIMENSIONS.every((d) => Boolean(props.scores[d.key]))

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", complete ? "border-zinc-200" : "border-amber-300")}> 
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-900 px-2 text-xs font-semibold text-white">
            {props.label}
          </div>
          <div className="text-sm font-semibold text-zinc-900">
            {props.revealModelNames ? props.modelName || "" : "盲评回答"}
          </div>
          {!complete ? <div className="text-xs text-amber-700">未完成评分</div> : null}
        </div>
        <button
          type="button"
          onClick={copyText}
          disabled={!hasText}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
            hasText ? "border-zinc-200 text-zinc-700 hover:bg-zinc-50" : "border-zinc-100 text-zinc-400"
          )}
        >
          <Copy className="h-4 w-4" />
          复制
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="max-h-[240px] overflow-y-auto rounded-lg bg-zinc-50 p-3 text-sm leading-6 text-zinc-900">
          {props.answer ? (
            <div className="md-content break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.answer}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-zinc-500">（空回答）</div>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900">{d.label}</div>
                <div className="text-xs text-zinc-500">{d.hint}</div>
              </div>
              <div className="shrink-0">
                <ScoreButtons value={props.scores[d.key]} onChange={(v) => props.onScore(d.key, v)} />
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-zinc-200 p-3">
            <div className="text-sm font-medium text-zinc-900">备注（可选）</div>
            <textarea
              value={props.note}
              onChange={(e) => props.onNote(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white p-2 text-sm outline-none focus:border-blue-500"
              placeholder="写下你认为重要的点（如事实错误、风格问题、个性化亮点）"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
