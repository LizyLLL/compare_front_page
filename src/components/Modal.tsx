import { X } from "lucide-react"
import type { ReactNode } from "react"

export default function Modal(props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-900">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{props.children}</div>
      </div>
    </div>
  )
}
