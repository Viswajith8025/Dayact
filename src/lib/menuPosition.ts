export function computeAnchoredMenuPosition(
  anchor: HTMLElement,
  menuWidth = 160,
  menuHeight = 168,
): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect()
  let top = rect.bottom + 6
  if (top + menuHeight > window.innerHeight - 12) {
    top = Math.max(12, rect.top - menuHeight - 6)
  }
  const left = Math.min(
    Math.max(12, rect.right - menuWidth),
    window.innerWidth - menuWidth - 12,
  )
  return { top, left }
}
