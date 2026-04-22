import { create } from "zustand"
import { BLIND_LABELS, DIMENSIONS, MODEL_KEYS, type BlindLabel, type DimensionKey, type ModelKey, type Score } from "@/utils/models"
import type { EvalDataset, EvalItem } from "@/utils/dataset"
import type { RatedItem } from "@/utils/exporters"

type ItemProgress = {
  mapping: Record<BlindLabel, ModelKey>
  ratings: Record<BlindLabel, { scores: Partial<Record<DimensionKey, Score>>; note: string }>
  itemNote: string
}

type PersistedState = {
  datasetId: string
  datasetName?: string
  sourceName?: string
  currentIndex: number
  revealModelNames: boolean
  progressByItemId: Record<string, ItemProgress>
}

const STORAGE_KEY = "blind-review:v1"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function makeDefaultRatings() {
  return BLIND_LABELS.reduce((acc, label) => {
    acc[label] = { scores: {}, note: "" }
    return acc
  }, {} as ItemProgress["ratings"])
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
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.datasetId !== "string") return null
    return parsed as PersistedState
  } catch {
    return null
  }
}

function savePersisted(next: PersistedState | null) {
  if (!next) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export type EvalState = {
  dataset: EvalDataset | null
  currentIndex: number
  revealModelNames: boolean
  progressByItemId: Record<string, ItemProgress>
  loadDataset: (dataset: EvalDataset, opts?: { preferRestore?: boolean }) => void
  clearProgress: () => void
  setCurrentIndex: (index: number) => void
  toggleReveal: () => void
  rate: (itemId: string, label: BlindLabel, dim: DimensionKey, score: Score) => void
  setAnswerNote: (itemId: string, label: BlindLabel, note: string) => void
  setItemNote: (itemId: string, note: string) => void
  getItem: () => EvalItem | null
  getProgress: (itemId: string) => ItemProgress
  isItemComplete: (itemId: string) => boolean
  buildRatedItems: () => RatedItem[]
}

export const useEvalStore = create<EvalState>((set, get) => {
  const persisted = typeof window !== "undefined" ? safeLoadPersisted() : null

  const initial: Pick<EvalState, "dataset" | "currentIndex" | "revealModelNames" | "progressByItemId"> = {
    dataset: null,
    currentIndex: 0,
    revealModelNames: false,
    progressByItemId: {},
  }

  if (persisted) {
    initial.currentIndex = persisted.currentIndex || 0
    initial.revealModelNames = Boolean(persisted.revealModelNames)
    initial.progressByItemId = persisted.progressByItemId || {}
  }

  function persistIfPossible(nextPartial: Partial<EvalState>) {
    const s = { ...get(), ...nextPartial }
    if (!s.dataset) return
    const payload: PersistedState = {
      datasetId: s.dataset.datasetId,
      datasetName: s.dataset.datasetName,
      sourceName: s.dataset.sourceName,
      currentIndex: s.currentIndex,
      revealModelNames: s.revealModelNames,
      progressByItemId: s.progressByItemId,
    }
    savePersisted(payload)
  }

  return {
    ...initial,
    loadDataset: (dataset, opts) => {
      const preferRestore = Boolean(opts?.preferRestore)
      const existing = safeLoadPersisted()
      const canRestore = existing && existing.datasetId === dataset.datasetId

      const baseProgress = dataset.items.reduce((acc, it) => {
        acc[it.id] = makeDefaultProgress()
        return acc
      }, {} as Record<string, ItemProgress>)

      const progressByItemId = preferRestore && canRestore ? { ...baseProgress, ...existing.progressByItemId } : baseProgress
      const revealModelNames = preferRestore && canRestore ? Boolean(existing.revealModelNames) : false
      const currentIndex = preferRestore && canRestore ? Math.min(existing.currentIndex || 0, Math.max(dataset.items.length - 1, 0)) : 0

      set({ dataset, progressByItemId, revealModelNames, currentIndex })
      persistIfPossible({ dataset, progressByItemId, revealModelNames, currentIndex })
    },
    clearProgress: () => {
      set({ dataset: null, currentIndex: 0, revealModelNames: false, progressByItemId: {} })
      savePersisted(null)
    },
    setCurrentIndex: (index) => {
      const ds = get().dataset
      if (!ds) return
      const next = Math.min(Math.max(0, index), Math.max(ds.items.length - 1, 0))
      set({ currentIndex: next })
      persistIfPossible({ currentIndex: next })
    },
    toggleReveal: () => {
      const next = !get().revealModelNames
      set({ revealModelNames: next })
      persistIfPossible({ revealModelNames: next })
    },
    rate: (itemId, label, dim, score) => {
      const p = get().progressByItemId[itemId] || makeDefaultProgress()
      const next: ItemProgress = {
        ...p,
        ratings: {
          ...p.ratings,
          [label]: { ...p.ratings[label], scores: { ...p.ratings[label].scores, [dim]: score } },
        },
      }
      const progressByItemId = { ...get().progressByItemId, [itemId]: next }
      set({ progressByItemId })
      persistIfPossible({ progressByItemId })
    },
    setAnswerNote: (itemId, label, note) => {
      const p = get().progressByItemId[itemId] || makeDefaultProgress()
      const next: ItemProgress = { ...p, ratings: { ...p.ratings, [label]: { ...p.ratings[label], note } } }
      const progressByItemId = { ...get().progressByItemId, [itemId]: next }
      set({ progressByItemId })
      persistIfPossible({ progressByItemId })
    },
    setItemNote: (itemId, note) => {
      const p = get().progressByItemId[itemId] || makeDefaultProgress()
      const next: ItemProgress = { ...p, itemNote: note }
      const progressByItemId = { ...get().progressByItemId, [itemId]: next }
      set({ progressByItemId })
      persistIfPossible({ progressByItemId })
    },
    getItem: () => {
      const ds = get().dataset
      if (!ds) return null
      return ds.items[get().currentIndex] || null
    },
    getProgress: (itemId) => {
      return get().progressByItemId[itemId] || makeDefaultProgress()
    },
    isItemComplete: (itemId) => {
      const p = get().progressByItemId[itemId]
      if (!p) return false
      for (const label of BLIND_LABELS) {
        for (const d of DIMENSIONS) {
          if (!p.ratings[label].scores[d.key]) return false
        }
      }
      return true
    },
    buildRatedItems: () => {
      const ds = get().dataset
      if (!ds) return []
      return ds.items.map((it) => {
        const p = get().getProgress(it.id)
        return {
          itemId: it.id,
          sampleId: it.sampleId,
          blindMapping: p.mapping,
          question: it.question,
          userStatus: it.userStatus,
          ratings: p.ratings,
          itemNote: p.itemNote,
        }
      })
    },
  }
})
