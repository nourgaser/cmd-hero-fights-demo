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
    typeof segment === 'string' ? segment : <b key={`${index}-${segment.value}`} className={numberClassName}>{segment.value}</b>,
  )
}

export function splitDetailTextIntoLines(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return []
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function simplifyTooltipSummaryText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return text
  }

  const compact = [
    /^([a-z0-9' -]+)\s+basic attack\s+/i,
    /^basic attack\s+/i,
    /^([a-z0-9' -]+)\s+active(?:\s+ability)?\s+/i,
    /^active(?:\s+ability)?\s+/i,
  ].reduce((current, pattern) => current.replace(pattern, ''), normalized)

  if (compact !== normalized && /^[a-z]/.test(compact)) {
    return `${compact.slice(0, 1).toUpperCase()}${compact.slice(1)}`
  }

  return compact
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
