import { useEffect, useMemo, useRef, useState } from "react"
import { FileUp, Languages, RefreshCcw, Trash2, UserRound } from "lucide-react"
import AnswerCard from "@/components/AnswerCard"
import Modal from "@/components/Modal"
import { cn } from "@/lib/utils"
import { parseDatasetFromJson, type EvalDataset, type EvalItem } from "@/utils/dataset"
import { downloadTextFile } from "@/utils/download"
import { prettyPrintUnknown } from "@/utils/format"
import { BLIND_LABELS, DIMENSIONS, MODEL_KEYS, MODEL_LABELS, type BlindLabel, type DimensionKey, type ModelKey, type Score } from "@/utils/models"
import { exportBundleToCsvText, exportBundleToJsonText, toExportBundle, type RatedAnswer, type RatedItem } from "@/utils/exporters"

type ItemProgress = {
  mapping: Record<BlindLabel, ModelKey>
  ratings: Record<BlindLabel, RatedAnswer>
  itemNote: string
}

type PersistedState = {
  datasetId: string
  currentIndex: number
  revealModelNames: boolean
  showChinese: boolean
  progressByItemId: Record<string, ItemProgress>
}

const STORAGE_KEY = "blind-review-home:v2"

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function makeDefaultRatings(): Record<BlindLabel, RatedAnswer> {
  return BLIND_LABELS.reduce((acc, label) => {
    acc[label] = { scores: {}, note: "" }
    return acc
  }, {} as Record<BlindLabel, RatedAnswer>)
}

function makeMapping(): Record<BlindLabel, ModelKey> {
  const shuffled = shuffle(MODEL_KEYS)
  return {
    A: shuffled[0],
    B: shuffled[1],
    C: shuffled[2],
    D: shuffled[3],
  }
}

function makeDefaultProgress(): ItemProgress {
  return { mapping: makeMapping(), ratings: makeDefaultRatings(), itemNote: "" }
}

function safeLoadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function isItemComplete(progress?: ItemProgress | null) {
  if (!progress) return false
  for (const label of BLIND_LABELS) {
    for (const dim of DIMENSIONS) {
      if (!progress.ratings[label]?.scores?.[dim.key]) return false
    }
  }
  return true
}

function buildBaseProgress(dataset: EvalDataset) {
  return dataset.items.reduce((acc, item) => {
    acc[item.id] = makeDefaultProgress()
    return acc
  }, {} as Record<string, ItemProgress>)
}

function getDisplayedText(showChinese: boolean, zh: string | undefined, en: string) {
  return showChinese && zh ? zh : en
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dataset, setDataset] = useState<EvalDataset | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progressByItemId, setProgressByItemId] = useState<Record<string, ItemProgress>>({})
  const [revealModelNames, setRevealModelNames] = useState(false)
  const [showChinese, setShowChinese] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")

  const item = dataset?.items[currentIndex] || null
  const progress = item ? progressByItemId[item.id] : null

  useEffect(() => {
    if (!dataset) return
    const persisted: PersistedState = {
      datasetId: dataset.datasetId,
      currentIndex,
      revealModelNames,
      showChinese,
      progressByItemId,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  }, [dataset, currentIndex, revealModelNames, showChinese, progressByItemId])

  const completedCount = useMemo(() => {
    if (!dataset) return 0
    return dataset.items.reduce((acc, current) => acc + (isItemComplete(progressByItemId[current.id]) ? 1 : 0), 0)
  }, [dataset, progressByItemId])

  const completionRate = dataset?.items.length ? Math.round((completedCount / dataset.items.length) * 100) : 0

  const loadDataset = (next: EvalDataset) => {
    const baseProgress = buildBaseProgress(next)
    const persisted = safeLoadPersisted()
    const canRestore = persisted?.datasetId === next.datasetId

    setDataset(next)
    setCurrentIndex(canRestore ? Math.min(persisted.currentIndex || 0, Math.max(next.items.length - 1, 0)) : 0)
    setRevealModelNames(canRestore ? Boolean(persisted.revealModelNames) : false)
    setShowChinese(canRestore ? Boolean(persisted.showChinese) && next.hasTranslations : Boolean(next.hasTranslations))
    setProgressByItemId(canRestore ? { ...baseProgress, ...persisted.progressByItemId } : baseProgress)
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = async (file: File | null) => {
    if (!file) return
    setImporting(true)
    setError("")
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      loadDataset(parseDatasetFromJson(json, file.name))
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const clearAll = () => {
    setDataset(null)
    setCurrentIndex(0)
    setProgressByItemId({})
    setRevealModelNames(false)
    setShowChinese(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  const updateProgress = (itemId: string, updater: (current: ItemProgress) => ItemProgress) => {
    setProgressByItemId((current) => {
      const previous = current[itemId] || makeDefaultProgress()
      return { ...current, [itemId]: updater(previous) }
    })
  }

  const rate = (itemId: string, label: BlindLabel, dim: DimensionKey, score: Score) => {
    updateProgress(itemId, (current) => ({
      ...current,
      ratings: {
        ...current.ratings,
        [label]: {
          ...current.ratings[label],
          scores: { ...current.ratings[label].scores, [dim]: score },
        },
      },
    }))
  }

  const setAnswerNote = (itemId: string, label: BlindLabel, note: string) => {
    updateProgress(itemId, (current) => ({
      ...current,
      ratings: {
        ...current.ratings,
        [label]: { ...current.ratings[label], note },
      },
    }))
  }

  const setItemNote = (itemId: string, note: string) => {
    updateProgress(itemId, (current) => ({ ...current, itemNote: note }))
  }

  const buildRatedItems = (): RatedItem[] => {
    if (!dataset) return []
    return dataset.items.map((current) => {
      const currentProgress = progressByItemId[current.id] || makeDefaultProgress()
      return {
        itemId: current.id,
        sampleId: current.sampleId,
        blindMapping: currentProgress.mapping,
        question: current.question,
        userStatus: current.userStatus,
        ratings: currentProgress.ratings,
        itemNote: currentProgress.itemNote,
      }
    })
  }

  const exportJson = () => {
    if (!dataset) return
    const fileName = `${dataset.sourceName || "ratings"}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
    const bundle = toExportBundle(dataset, buildRatedItems())
    downloadTextFile(fileName, exportBundleToJsonText(bundle), "application/json")
  }

  const exportCsv = () => {
    if (!dataset) return
    const fileName = `${dataset.sourceName || "ratings"}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    const bundle = toExportBundle(dataset, buildRatedItems())
    downloadTextFile(fileName, exportBundleToCsvText(bundle), "text/csv")
  }

  const renderHeader = (
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">多模型盲评标注工具</div>
          <div className="truncate text-xs text-zinc-500">
            {dataset ? `${dataset.sourceName || "已加载数据"} · 共 ${dataset.items.length} 组` : "加载本地 JSON 后开始评审"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            {importing ? "导入中…" : "导入 JSON"}
          </button>

          <button
            type="button"
            onClick={() => setRevealModelNames((current) => !current)}
            disabled={importing || !dataset}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            {revealModelNames ? "已显示模型名" : "显示模型名"}
          </button>

          <button
            type="button"
            onClick={() => setShowChinese((current) => !current)}
            disabled={!dataset?.hasTranslations}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50",
              showChinese ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            )}
          >
            <Languages className="h-4 w-4" />
            {showChinese ? "当前中文" : "切换中文"}
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Trash2 className="h-4 w-4" />
            清空
          </button>
        </div>
      </div>
      {error ? (
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        </div>
      ) : null}
    </div>
  )

  if (!dataset || !item || !progress) {
    return (
      <div className="min-h-screen bg-zinc-50">
        {renderHeader}
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">开始一次人工标注</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              导入 `mocked_record_list.json` 或 `mocked_record_list_translated.json`。如果导入的是带中文字段版本，页面右上角会自动启用中英切换按钮。
            </div>
            <div className="mt-6">
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
                {importing ? "导入中…" : "选择 JSON 文件"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const displayedQuestion = getDisplayedText(showChinese, item.questionZh, item.question)
  const displayedStatus = showChinese && item.userStatusZh != null ? item.userStatusZh : item.userStatus
  const displayedProfile = showChinese && item.userProfileZh != null ? item.userProfileZh : item.userProfile
  const itemComplete = isItemComplete(progress)
  const total = dataset.items.length

  const answersByLabel = BLIND_LABELS.map((label) => {
    const modelKey = progress.mapping[label]
    const text = showChinese && item.answersZh[modelKey] ? item.answersZh[modelKey] || "" : item.answers[modelKey]
    return { label, modelKey, text }
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      {renderHeader}

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">
                    第 {currentIndex + 1} / {total} 组
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    sample_id: {item.sampleId || "-"} · 已完成 {completedCount} 组（{completionRate}%）
                  </div>
                </div>
                <div className={cn("rounded-lg px-2 py-1 text-xs font-medium", itemComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {itemComplete ? "本组已完成" : "本组未完成"}
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full bg-blue-600" style={{ width: `${completionRate}%` }} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                  disabled={currentIndex === 0}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  上一组
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentIndex((current) => Math.min(total - 1, current + 1))}
                  disabled={currentIndex >= total - 1}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  下一组
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">问题</div>
              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-900">{displayedQuestion || "（空问题）"}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-900">User Status</div>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <UserRound className="h-4 w-4" />
                  查看用户档案
                </button>
              </div>
              <pre className="mt-2 max-h-[220px] overflow-y-auto rounded-lg bg-zinc-50 p-3 text-xs leading-6 text-zinc-700">{prettyPrintUnknown(displayedStatus)}</pre>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">整组备注（可选）</div>
              <textarea
                rows={3}
                value={progress.itemNote}
                onChange={(e) => setItemNote(item.id, e.target.value)}
                className="mt-2 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="记录这一组整体的判断依据"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-900">导出评分</div>
                <div className="text-xs text-zinc-500">导出包含 sample_id 与 A-D 对应模型映射</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={exportJson} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  导出 JSON
                </button>
                <button type="button" onClick={exportCsv} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  导出 CSV
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">盲评回答区</div>
              <div className="mt-1 text-xs text-zinc-500">默认隐藏模型名；如果加载了翻译版 JSON，可以使用右上角按钮切换为中文展示。</div>
            </div>

            {answersByLabel.map((answer) => (
              <AnswerCard
                key={answer.label}
                label={answer.label}
                modelName={MODEL_LABELS[answer.modelKey]}
                revealModelNames={revealModelNames}
                answer={answer.text}
                scores={progress.ratings[answer.label].scores}
                note={progress.ratings[answer.label].note}
                onScore={(dim, score) => rate(item.id, answer.label, dim, score)}
                onNote={(note) => setAnswerNote(item.id, answer.label, note)}
              />
            ))}
          </div>
        </div>
      </div>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="用户档案">
        <pre className="rounded-lg bg-zinc-50 p-3 text-xs leading-6 text-zinc-700">{prettyPrintUnknown(displayedProfile)}</pre>
      </Modal>
    </div>
  )
}
