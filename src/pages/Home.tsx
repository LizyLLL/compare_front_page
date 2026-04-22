import { useMemo, useRef, useState } from "react"
import { FileUp, FolderOpen, RefreshCcw, Trash2 } from "lucide-react"
import AnswerCard from "@/components/AnswerCard"
import Modal from "@/components/Modal"
import { cn } from "@/lib/utils"
import { useEvalStore } from "@/store/evalStore"
import { parseDatasetFromJson } from "@/utils/dataset"
import { prettyPrintUnknown } from "@/utils/format"
import { SAMPLE_DATASET } from "@/utils/sampleDataset"
import { BLIND_LABELS, DIMENSIONS, MODEL_LABELS, type BlindLabel, type ModelKey } from "@/utils/models"
import { downloadTextFile } from "@/utils/download"
import { exportBundleToCsvText, exportBundleToJsonText, toExportBundle } from "@/utils/exporters"

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string>("")
  const [importing, setImporting] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const dataset = useEvalStore((s) => s.dataset)
  const currentIndex = useEvalStore((s) => s.currentIndex)
  const revealModelNames = useEvalStore((s) => s.revealModelNames)
  const loadDataset = useEvalStore((s) => s.loadDataset)
  const clearProgress = useEvalStore((s) => s.clearProgress)
  const setCurrentIndex = useEvalStore((s) => s.setCurrentIndex)
  const toggleReveal = useEvalStore((s) => s.toggleReveal)
  const getItem = useEvalStore((s) => s.getItem)
  const progressByItemId = useEvalStore((s) => s.progressByItemId)
  const buildRatedItems = useEvalStore((s) => s.buildRatedItems)
  const rate = useEvalStore((s) => s.rate)
  const setAnswerNote = useEvalStore((s) => s.setAnswerNote)
  const setItemNote = useEvalStore((s) => s.setItemNote)

  const item = getItem()
  const progress = item ? progressByItemId[item.id] : null

  const isProgressComplete = (p: typeof progress) => {
    if (!p) return false
    for (const label of BLIND_LABELS) {
      const scores = p.ratings[label]?.scores
      if (!scores) return false
      for (const d of DIMENSIONS) {
        if (!scores[d.key]) return false
      }
    }
    return true
  }

  const total = dataset?.items.length || 0
  const completedCount = useMemo(() => {
    if (!dataset) return 0
    return dataset.items.reduce((acc, it) => acc + (isProgressComplete(progressByItemId[it.id]) ? 1 : 0), 0)
  }, [dataset, progressByItemId])

  const completionRate = total ? Math.round((completedCount / total) * 100) : 0

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = async (f: File | null) => {
    if (!f) return
    setError("")
    setImporting(true)
    try {
      const text = await f.text()
      const json = JSON.parse(text)
      const ds = parseDatasetFromJson(json, f.name)
      loadDataset(ds, { preferRestore: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "加载失败"
      setError(msg)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const goPrev = () => setCurrentIndex(currentIndex - 1)
  const goNext = () => setCurrentIndex(currentIndex + 1)

  const exportJson = () => {
    if (!dataset) return
    const bundle = toExportBundle(dataset, buildRatedItems())
    const name = `${dataset.datasetName || "dataset"}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
    downloadTextFile(name, exportBundleToJsonText(bundle), "application/json")
  }

  const exportCsv = () => {
    if (!dataset) return
    const bundle = toExportBundle(dataset, buildRatedItems())
    const name = `${dataset.datasetName || "dataset"}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    downloadTextFile(name, exportBundleToCsvText(bundle), "text/csv")
  }

  const header = (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">模型盲评对比工具</div>
          <div className="truncate text-xs text-zinc-500">
            {dataset ? `${dataset.datasetName || "未命名数据集"} · ${dataset.sourceName || ""}` : "加载本地 JSON 列表开始评测"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={onPickFile}
            disabled={importing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white",
              importing ? "opacity-60" : "hover:bg-blue-700"
            )}
          >
            <FileUp className="h-4 w-4" />
            加载 JSON
          </button>
          <button
            type="button"
            onClick={() => {
              setError("")
              loadDataset(SAMPLE_DATASET, { preferRestore: false })
            }}
            disabled={importing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700",
              importing ? "opacity-60" : "hover:bg-zinc-50"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            加载示例
          </button>
          <button
            type="button"
            onClick={toggleReveal}
            disabled={importing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              revealModelNames ? "border-blue-200 bg-blue-50 text-blue-700" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
              importing ? "opacity-60" : ""
            )}
          >
            <RefreshCcw className="h-4 w-4" />
            {revealModelNames ? "已显示模型名" : "显示模型名"}
          </button>
          <button
            type="button"
            onClick={clearProgress}
            disabled={importing}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700",
              importing ? "opacity-60" : "hover:bg-zinc-50"
            )}
          >
            <Trash2 className="h-4 w-4" />
            清空
          </button>
          {importing ? (
            <div className="ml-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
              导入中…
            </div>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        </div>
      ) : null}
    </div>
  )

  if (!dataset || !item || !progress) {
    return (
      <div className="min-h-screen bg-zinc-50">
        {header}
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">开始一次盲评</div>
            <div className="mt-2 text-sm text-zinc-600">
              选择一个本地 JSON 列表文件（或加载示例），页面会随机打乱四个模型回答为 A/B/C/D，按三维度 1–5 评分并导出。
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onPickFile}
                disabled={importing}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white",
                  importing ? "opacity-60" : "hover:bg-blue-700"
                )}
              >
                <FileUp className="h-4 w-4" />
                {importing ? "导入中…" : "加载 JSON"}
              </button>
              <button
                type="button"
                onClick={() => loadDataset(SAMPLE_DATASET, { preferRestore: false })}
                disabled={importing}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700",
                  importing ? "opacity-60" : "hover:bg-zinc-50"
                )}
              >
                <FolderOpen className="h-4 w-4" />
                加载示例
              </button>
            </div>
            <div className="mt-6 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              兼容格式：数组、{"{ items: [...] }"} 或单条记录对象。每条记录需包含 model_outputs，且包含 gpt_4o/skillrl/our_method/claude_sonnet_4_6。
            </div>
          </div>
        </div>
      </div>
    )
  }

  const itemComplete = isProgressComplete(progress)

  const answersByLabel: Array<{ label: BlindLabel; modelKey: ModelKey; text: string }> = BLIND_LABELS.map((label) => {
    const modelKey = progress.mapping[label]
    return { label, modelKey, text: item.answers[modelKey] }
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      {header}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">第 {currentIndex + 1} / {total} 组</div>
                  <div className="text-xs text-zinc-500">已完成 {completedCount} 组（{completionRate}%）</div>
                </div>
                <div className={cn("rounded-lg px-2 py-1 text-xs font-medium", itemComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}> 
                  {itemComplete ? "本组已完成" : "本组未完成"}
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full bg-blue-600" style={{ width: `${completionRate}%` }} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    currentIndex === 0 ? "border-zinc-100 text-zinc-400" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  上一组
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={currentIndex >= total - 1}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    currentIndex >= total - 1 ? "border-zinc-100 text-zinc-400" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  下一组
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-xs text-zinc-500">跳转</div>
                  <input
                    type="number"
                    min={1}
                    max={total}
                    defaultValue={currentIndex + 1}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return
                      const v = Number((e.target as HTMLInputElement).value)
                      if (!Number.isFinite(v)) return
                      setCurrentIndex(v - 1)
                    }}
                    className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">问题</div>
              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900">{item.question || "（空问题）"}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-900">User Status</div>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  查看用户档案
                </button>
              </div>
              <div className="mt-2 max-h-[200px] overflow-y-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                <div className="whitespace-pre-wrap break-words font-mono">{prettyPrintUnknown(item.userStatus)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">整组备注（可选）</div>
              <textarea
                value={progress.itemNote}
                onChange={(e) => setItemNote(item.id, e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white p-2 text-sm outline-none focus:border-blue-500"
                placeholder="比如：整体偏好、明显错误、或你认为需要记录的评审理由"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-900">导出</div>
                <div className="text-xs text-zinc-500">已完成 {completedCount} / {total}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  导出 CSV
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">导出会包含盲评映射关系（A-D 对应的原始模型键）。</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">盲评回答区</div>
              <div className="mt-1 text-xs text-zinc-500">默认隐藏模型名并随机顺序展示为 A/B/C/D，可切换显示模型名用于复核。</div>
            </div>

            {answersByLabel.map((a) => {
              const rated = progress.ratings[a.label]
              const modelName = MODEL_LABELS[a.modelKey] || a.modelKey
              return (
                <AnswerCard
                  key={a.label}
                  label={a.label}
                  modelName={modelName}
                  revealModelNames={revealModelNames}
                  answer={a.text}
                  scores={rated.scores}
                  note={rated.note}
                  onScore={(dim, score) => rate(item.id, a.label, dim, score)}
                  onNote={(note) => setAnswerNote(item.id, a.label, note)}
                />
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        open={profileOpen}
        title="用户档案（user_profile）"
        onClose={() => setProfileOpen(false)}
      >
        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
          <div className="whitespace-pre-wrap break-words font-mono">{prettyPrintUnknown(item.userProfile)}</div>
        </div>
      </Modal>
    </div>
  )
}
