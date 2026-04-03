import type { ReactNode } from 'react'

const NUMERIC_TOKEN_PATTERN = /([+-]?\d+(?:\.\d+)?%?)/g

export function renderTextWithHighlightedNumbers(
  text: string,
  numberClassName = 'hand-card-tooltip-number',
): ReactNode[] {
  const segments: Array<string | { value: string; highlight: boolean }> = []
  let lastIndex = 0

  for (const match of text.matchAll(NUMERIC_TOKEN_PATTERN)) {
    const [value] = match
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push(text.slice(lastIndex, index))
    }

    segments.push({ value, highlight: true })
    lastIndex = index + value.length
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  return segments.map((segment, index) =>
    typeof segment === 'string' ? (
      <span key={`${index}-${segment}`}>{segment}</span>
    ) : (
      <span key={`${index}-${segment.value}`} className={numberClassName}>
        {segment.value}
      </span>
    ),
  )
}

export function splitSummaryAndDetail(message: string): { summary: string; detail: string | null } {
  const trimmed = message.trim()
  if (!trimmed) {
    return { summary: '', detail: null }
  }

  const rngMarker = '. RNG '
  const markerIndex = trimmed.indexOf(rngMarker)
  if (markerIndex >= 0) {
    const summary = trimmed.slice(0, markerIndex + 1).trim()
    const detail = trimmed.slice(markerIndex + 2).trim()
    return {
      summary,
      detail: detail || null,
    }
  }

  const firstSentenceMatch = trimmed.match(/^[^.!?]+[.!?]/)
  if (firstSentenceMatch && firstSentenceMatch[0].length < trimmed.length) {
    const summary = firstSentenceMatch[0].trim()
    const detail = trimmed.slice(firstSentenceMatch[0].length).trim()
    return {
      summary,
      detail: detail || null,
    }
  }

  return {
    summary: trimmed,
    detail: null,
  }
}
