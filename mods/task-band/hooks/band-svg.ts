import type { BandTask } from '../types'

import { STAGE_COUNT, progress, stageStep } from './band-model'

// The desktop row: one SVG holding the marker, title, track, dithered fill,
// box ticks, the stage pill riding the fill's leading edge, and the percent.
// The ✕ stays outside it as a real Button.

export const ROW_HEIGHT = 28
const TRACK_HEIGHT = 20
const TRACK_Y = (ROW_HEIGHT - TRACK_HEIGHT) / 2
const PERCENT_WIDTH = 52
const DOT_STEP = 3
const DOT_SIZE = 2
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"

const ACCENT = { doing: '#8B87F5', review: '#E8875F' } as const

const escapeXml = (text: string): string =>
  text.replace(/[<>&"']/g, char => `&#${char.charCodeAt(0)};`)

// Deterministic per task, so the texture does not shimmer between redraws.
const seededRandom = (seed: string): (() => number) => {
  let state = 2166136261
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619)
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

// Rough width of proportional text at 13–15px; used only to size the pill
// and cut the title, so a few pixels either way do not matter.
const textWidth = (text: string, size: number): number => text.length * size * 0.56

const fitTitle = (title: string, width: number, size: number): string => {
  if (textWidth(title, size) <= width) return title
  const chars = Math.max(1, Math.floor(width / (size * 0.56)) - 1)
  return `${title.slice(0, chars)}…`
}

export const pillParts = (task: BandTask): { label: string; count: string } => ({
  label: task.status === 'review' ? 'review' : (task.stage ?? 'doing'),
  count: `${stageStep(task)}/${STAGE_COUNT}`,
})

export const rowAlt = (task: BandTask): string => {
  const { label, count } = pillParts(task)
  const percent = Math.round(progress(task) * 100)
  const criteria = task.total > 0 ? `${task.done}/${task.total} criteria, ` : ''
  return `${task.id}: ${label} ${count}, ${criteria}${percent}%`
}

export const rowSvg = (task: BandTask, width: number): string => {
  const accent = ACCENT[task.status]
  const random = seededRandom(task.id)
  const ratio = progress(task)

  const titleWidth = Math.round(Math.min(300, Math.max(140, width * 0.3)))
  const trackX = titleWidth + 8
  const trackWidth = Math.max(80, width - trackX - PERCENT_WIDTH)
  const fillWidth = Math.round(trackWidth * ratio)
  const radius = TRACK_HEIGHT / 2

  // Dither: denser toward the fill's leading edge, two strengths of dot.
  let strong = ''
  let faint = ''
  for (let x = 0; x < fillWidth; x += DOT_STEP) {
    const density = 0.12 + 0.68 * (x / Math.max(1, fillWidth))
    for (let y = 0; y < TRACK_HEIGHT; y += DOT_STEP) {
      const roll = random()
      const dot = `M${trackX + x} ${TRACK_Y + y}h${DOT_SIZE}v${DOT_SIZE}h-${DOT_SIZE}z`
      if (roll < density) strong += dot
      else if (roll < density + 0.15) faint += dot
    }
  }

  let ticks = ''
  if (task.total > 1 && trackWidth / task.total >= 8) {
    for (let box = 1; box < task.total; box++) {
      const x = Math.round(trackX + (box * trackWidth) / task.total)
      const isFilled = x < trackX + fillWidth
      ticks += isFilled
        ? `<line class="tick-fill" x1="${x}" x2="${x}" y1="${TRACK_Y + 2}" y2="${TRACK_Y + TRACK_HEIGHT - 2}"/>`
        : `<line class="tick" x1="${x}" x2="${x}" y1="${TRACK_Y + 6}" y2="${TRACK_Y + TRACK_HEIGHT - 6}"/>`
    }
  }

  const { label, count } = pillParts(task)
  const pillWidth = Math.round(textWidth(label, 12) + textWidth(count, 12) + 26)
  const pillX = Math.round(
    Math.min(trackX + trackWidth - pillWidth, Math.max(trackX, trackX + fillWidth - pillWidth)),
  )

  const marker =
    task.priority === 1
      ? `<text class="urgent" x="9" y="${ROW_HEIGHT / 2 + 4.5}" font-size="13" font-weight="700">!</text>`
      : `<circle cx="11" cy="${ROW_HEIGHT / 2}" r="3.5" fill="${accent}"/>`
  const title = escapeXml(fitTitle(task.id, titleWidth - 24, 13))
  const percent = `${Math.round(ratio * 100)}%`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ROW_HEIGHT}" viewBox="0 0 ${width} ${ROW_HEIGHT}" font-family="${FONT}">`,
    '<style>',
    '.title{fill:#ECECEC}.muted{fill:#9A9AA0}.track{fill:#2A2A2E}.tick{stroke:#5E5E66;stroke-width:2}',
    '.tick-fill{stroke:rgba(255,255,255,.75);stroke-width:2}.urgent{fill:#E8735F}.pill-count{fill:rgba(255,255,255,.78)}',
    '@media (prefers-color-scheme: light){.title{fill:#1F1F22}.muted{fill:#6B6B72}.track{fill:#E6E6EA}.tick{stroke:#B8B8C0}}',
    '</style>',
    `<defs><clipPath id="track"><rect x="${trackX}" y="${TRACK_Y}" width="${trackWidth}" height="${TRACK_HEIGHT}" rx="${radius}"/></clipPath></defs>`,
    marker,
    `<text class="title" x="22" y="${ROW_HEIGHT / 2 + 4.5}" font-size="13" font-weight="600">${title}</text>`,
    `<rect class="track" x="${trackX}" y="${TRACK_Y}" width="${trackWidth}" height="${TRACK_HEIGHT}" rx="${radius}"/>`,
    `<g clip-path="url(#track)">`,
    `<rect x="${trackX}" y="${TRACK_Y}" width="${fillWidth}" height="${TRACK_HEIGHT}" fill="${accent}" fill-opacity=".14"/>`,
    faint ? `<path d="${faint}" fill="${accent}" fill-opacity=".35"/>` : '',
    strong ? `<path d="${strong}" fill="${accent}" fill-opacity=".85"/>` : '',
    ticks,
    '</g>',
    `<rect x="${pillX}" y="${TRACK_Y}" width="${pillWidth}" height="${TRACK_HEIGHT}" rx="${radius}" fill="${accent}"/>`,
    `<text x="${pillX + 10}" y="${ROW_HEIGHT / 2 + 4}" font-size="12" font-weight="600">`,
    `<tspan fill="#FFFFFF">${escapeXml(label)}</tspan><tspan class="pill-count" dx="5">${count}</tspan>`,
    '</text>',
    `<text class="muted" x="${width - 4}" y="${ROW_HEIGHT / 2 + 4.5}" font-size="13" text-anchor="end">${percent}</text>`,
    '</svg>',
  ].join('')
}
