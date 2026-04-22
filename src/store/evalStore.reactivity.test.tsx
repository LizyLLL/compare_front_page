import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useEvalStore } from "@/store/evalStore"

function TestComponent() {
  const rate = useEvalStore((s) => s.rate)
  const progressByItemId = useEvalStore((s) => s.progressByItemId)
  const v = progressByItemId["item_1"].ratings.A.scores.q_relevance

  return (
    <div>
      <div data-testid="value">{v ?? "none"}</div>
      <button type="button" onClick={() => rate("item_1", "A", "q_relevance", 5)}>
        rate
      </button>
    </div>
  )
}

describe("evalStore reactivity", () => {
  it("updates subscribers immediately when rating changes", () => {
    useEvalStore.setState({
      dataset: null,
      currentIndex: 0,
      revealModelNames: false,
      progressByItemId: {
        item_1: {
          mapping: { A: "gpt_4o", B: "skillrl", C: "our_method", D: "claude_sonnet_4_6" },
          ratings: {
            A: { scores: {}, note: "" },
            B: { scores: {}, note: "" },
            C: { scores: {}, note: "" },
            D: { scores: {}, note: "" },
          },
          itemNote: "",
        },
      },
    })

    render(<TestComponent />)
    expect(screen.getByTestId("value").textContent).toBe("none")
    fireEvent.click(screen.getByText("rate"))
    expect(screen.getByTestId("value").textContent).toBe("5")
  })
})

