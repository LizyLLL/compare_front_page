import type { ReactNode } from "react"

export default function Modal(props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={props.onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-900">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[calc(85vh-60px)] overflow-y-auto p-4">{props.children}</div>
      </div>
    </div>
  )
}
