import { Copy } from "lucide-react"
import { Fragment } from "react"
import ScoreButtons from "@/components/ScoreButtons"
import { cn } from "@/lib/utils"
import { DIMENSIONS, type BlindLabel, type DimensionKey, type Score } from "@/utils/models"

function renderInline(text: string) {
  const nodes: Array<string | JSX.Element> = []
  let rest = text
  let key = 0

  while (rest.length > 0) {
    const bold = rest.match(/\*\*(.+?)\*\*/)
    const code = rest.match(/`([^`]+)`/)
    const link = rest.match(/\[([^\]]+)\]\(([^)]+)\)/)
    const candidates = [bold, code, link].filter(Boolean) as RegExpMatchArray[]
    if (!candidates.length) {
      nodes.push(rest)
      break
    }
    candidates.sort((a, b) => (a.index || 0) - (b.index || 0))
    const match = candidates[0]
    const index = match.index || 0
    if (index > 0) nodes.push(rest.slice(0, index))
    if (match[0].startsWith("**")) {
      nodes.push(
        <strong key={`b-${key += 1}`} className="font-semibold">
          {match[1]}
        </strong>
      )
    } else if (match[0].startsWith("`")) {
      nodes.push(
        <code key={`c-${key += 1}`} className="rounded bg-zinc-100 px-1 py-0.5 text-[0.9em]">
          {match[1]}
        </code>
      )
    } else {
      nodes.push(
        <a
          key={`l-${key += 1}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {match[1]}
        </a>
      )
    }
    rest = rest.slice(index + match[0].length)
  }

  return nodes.map((node, idx) => <Fragment key={idx}>{node}</Fragment>)
}

function MarkdownView({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const nodes: JSX.Element[] = []
  let i = 0

  const isTableRow = (line: string) => line.includes("|")
  const isTableSeparator = (line: string) => /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line)

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length || 1
      const content = trimmed.replace(/^#{1,6}\s+/, "")
      const className =
        level === 1
          ? "text-xl font-bold"
          : level === 2
            ? "text-lg font-bold"
            : "text-base font-semibold"
      nodes.push(
        <div key={`h-${i}`} className={className}>
          {renderInline(content)}
        </div>
      )
      i += 1
      continue
    }

    if (trimmed === "---" || trimmed === "***") {
      nodes.push(<hr key={`hr-${i}`} className="my-3 border-zinc-200" />)
      i += 1
      continue
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""))
        i += 1
      }
      nodes.push(
        <blockquote key={`q-${i}`} className="border-l-4 border-zinc-300 pl-3 text-zinc-700">
          {quoteLines.map((q, idx) => (
            <div key={idx}>{renderInline(q)}</div>
          ))}
        </blockquote>
      )
      continue
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i += 1
      }
      i += 1
      nodes.push(
        <pre key={`pre-${i}`} className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">
          <code>{codeLines.join("\n")}</code>
        </pre>
      )
      continue
    }

    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      const tableLines: string[] = [trimmed]
      i += 2
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableLines.push(lines[i].trim())
        i += 1
      }
      const rows = tableLines.map((row) =>
        row
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell, index, arr) => !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === ""))
      )
      const headers = rows[0]
      const body = rows.slice(1)
      nodes.push(
        <div key={`table-${i}`} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className="border border-zinc-200 bg-zinc-100 px-2 py-1">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-zinc-200 px-2 py-1 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""))
        i += 1
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && !/^#{1,6}\s/.test(lines[i].trim()) && !/^[-*]\s+/.test(lines[i].trim())) {
      if (isTableRow(lines[i].trim()) && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) break
      if (lines[i].trim().startsWith(">") || lines[i].trim().startsWith("```")) break
      paragraph.push(lines[i].trim())
      i += 1
    }
    nodes.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap break-words">
        {renderInline(paragraph.join(" "))}
      </p>
    )
  }

  return <div className="space-y-3 text-sm leading-6 text-zinc-900">{nodes}</div>
}

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
  const complete = DIMENSIONS.every((d) => Boolean(props.scores[d.key]))

  return (
    <div className={cn("rounded-xl border bg-white shadow-sm", complete ? "border-zinc-200" : "border-amber-300")}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-900 px-2 text-xs font-semibold text-white">
            {props.label}
          </div>
          <div className="text-sm font-semibold text-zinc-900">{props.revealModelNames ? props.modelName || "" : "盲评回答"}</div>
          {!complete ? <div className="text-xs text-amber-700">未完成评分</div> : null}
        </div>
        <button
          type="button"
          disabled={!hasText}
          onClick={() => navigator.clipboard.writeText(props.answer)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
            hasText ? "border-zinc-200 text-zinc-700 hover:bg-zinc-50" : "border-zinc-100 text-zinc-400"
          )}
        >
          <Copy className="h-4 w-4" />
          复制
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="max-h-[280px] overflow-y-auto rounded-lg bg-zinc-50 p-3">
          {hasText ? <MarkdownView text={props.answer} /> : <div className="text-sm text-zinc-500">（空回答）</div>}
        </div>

        {DIMENSIONS.map((dimension) => (
          <div key={dimension.key} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-900">{dimension.label}</div>
              <div className="text-xs text-zinc-500">{dimension.hint}</div>
            </div>
            <ScoreButtons value={props.scores[dimension.key]} onChange={(v) => props.onScore(dimension.key, v)} />
          </div>
        ))}

        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-sm font-medium text-zinc-900">备注（可选）</div>
          <textarea
            value={props.note}
            onChange={(e) => props.onNote(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="记录你判断的理由或异常点"
          />
        </div>
      </div>
    </div>
  )
}
