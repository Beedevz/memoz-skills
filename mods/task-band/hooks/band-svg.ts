import type { BandTask } from '../types'

import {
  STAGE_COUNT,
  ageText,
  criteriaText,
  flagText,
  graphemeWidth,
  priorityText,
  progress,
  splitGraphemes,
  stageName,
  stageStep,
  taskLabel,
} from './band-model'

// The desktop row: one SVG holding the priority, the code and title, the stage
// as four dots and its name, the criteria track (dithered fill, one tick per
// box boundary) with its `n/m`, the age of the last step and the flag. The ✕
// stays outside it as a real Button.

export const ROW_HEIGHT = 28
const TRACK_HEIGHT = 20
const TRACK_Y = (ROW_HEIGHT - TRACK_HEIGHT) / 2
const DOT_STEP = 3
const DOT_SIZE = 2
const STAGE_DOT_GAP = 11
const COLUMN_GAP = 12
const MIN_TRACK = 90
const COUNT_WIDTH = 40
const PRIORITY_MIN = 26
const PRIORITY_X = 6
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"

const ACCENT = { doing: '#8B87F5', review: '#E8875F' } as const
const FLAG_COLOR = '#E8735F'

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

// Rough width of proportional text at 11–15px; used only to size columns and
// cut the title, so a few pixels either way do not matter. A narrow character is
// about 0.56 em, a wide one (CJK, fullwidth, emoji) about 1 em, a combining mark
// nothing.
const EM_NARROW = 0.56
const EM_WIDE = 1
const clusterWidth = (cluster: string, size: number): number => {
  const columns = graphemeWidth(cluster)
  return columns === 0 ? 0 : size * (columns === 2 ? EM_WIDE : EM_NARROW)
}
export const textWidth = (text: string, size: number): number => {
  let width = 0
  for (const cluster of splitGraphemes(text)) width += clusterWidth(cluster, size)
  return width
}

// Cut on a grapheme boundary: a surrogate pair or a ZWJ sequence is never split.
export const fitTitle = (title: string, width: number, size: number): string => {
  if (textWidth(title, size) <= width) return title
  let used = textWidth('…', size)
  let kept = ''
  for (const cluster of splitGraphemes(title)) {
    const next = clusterWidth(cluster, size)
    if (used + next > width) break
    kept += cluster
    used += next
  }
  return `${kept}…`
}

const widest = (tasks: readonly BandTask[], text: (task: BandTask) => string, size: number): number =>
  Math.max(0, ...tasks.map(task => textWidth(text(task), size)))

export type DesktopLayout = {
  /** Where the label starts: after the widest priority tag and a gap; 8 when no row has a priority. */
  priorityWidth: number
  /** Right edge of the code-and-title label. */
  labelEnd: number
  stageX: number
  /** Width of the stage name after the dots; 0 = dots only. */
  nameWidth: number
  trackX: number
  trackWidth: number
  countEnd: number
  /** Right edge of the age text; null = not shown. */
  ageEnd: number | null
  flagX: number
  /** Width of the flag chip; 0 = no row has a flag. */
  flagWidth: number
  flagMark: boolean
}

// One layout for every row, so the columns line up. When the band is too narrow
// for the whole row the pieces go in this order: the flag chip becomes a `!`,
// the stage name goes (the dots stay), the age goes, and last the label
// shrinks. The criteria track and its count, the stage dots and the flag mark
// are never dropped.
export const desktopLayout = (tasks: readonly BandTask[], width: number): DesktopLayout => {
  const labelWanted = Math.round(Math.min(260, Math.max(130, width * 0.28)))
  const nameWanted = Math.round(widest(tasks, stageName, 12)) + 8
  const ageWanted = Math.round(widest(tasks, ageText, 12))
  const flagWanted = Math.round(widest(tasks, flagText, 11)) + 14
  const hasFlags = tasks.some(task => task.flags.length > 0)
  const priorityTag = Math.round(widest(tasks, priorityText, 12))
  const priorityWidth = priorityTag > 0 ? Math.max(PRIORITY_MIN, PRIORITY_X + priorityTag + 6) : 8
  const dots = STAGE_COUNT * STAGE_DOT_GAP

  const build = (
    label: number,
    nameWidth: number,
    ageWidth: number,
    flagWidth: number,
    flagMark: boolean,
  ): DesktopLayout => {
    const stageX = priorityWidth + label + COLUMN_GAP
    const trackX = stageX + dots + nameWidth + COLUMN_GAP
    const tail =
      COUNT_WIDTH + (ageWidth > 0 ? COLUMN_GAP + ageWidth : 0) + (flagWidth > 0 ? COLUMN_GAP + flagWidth : 0)
    const trackWidth = width - 4 - trackX - 8 - tail
    const countEnd = trackX + trackWidth + 8 + COUNT_WIDTH
    const ageEnd = ageWidth > 0 ? countEnd + COLUMN_GAP + ageWidth : null
    const flagX = (ageEnd ?? countEnd) + COLUMN_GAP
    return {
      priorityWidth,
      labelEnd: priorityWidth + label,
      stageX,
      nameWidth,
      trackX,
      trackWidth,
      countEnd,
      ageEnd,
      flagX,
      flagWidth,
      flagMark,
    }
  }

  const markWidth = hasFlags ? 18 : 0
  const attempts = [
    build(labelWanted, nameWanted, ageWanted, hasFlags ? flagWanted : 0, false),
    build(labelWanted, nameWanted, ageWanted, markWidth, true),
    build(labelWanted, 0, ageWanted, markWidth, true),
    build(labelWanted, 0, 0, markWidth, true),
    build(90, 0, 0, markWidth, true),
    build(60, 0, 0, markWidth, true),
  ]
  return attempts.find(layout => layout.trackWidth >= MIN_TRACK) ?? attempts[attempts.length - 1]!
}

export const rowSvg = (
  task: BandTask,
  width: number,
  layout: DesktopLayout = desktopLayout([task], width),
): string => {
  const accent = ACCENT[task.status]
  const random = seededRandom(task.id)
  const ratio = progress(task)

  const { trackX, trackWidth } = layout
  const fillWidth = Math.round(trackWidth * ratio)
  const radius = TRACK_HEIGHT / 2
  const mid = ROW_HEIGHT / 2

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

  const priority =
    task.priority === null
      ? ''
      : `<text class="${task.priority === 1 ? 'urgent' : 'muted'}" x="${PRIORITY_X}" y="${mid + 4.5}" font-size="12" font-weight="700">${escapeXml(priorityText(task))}</text>`

  const { code, title } = taskLabel(task)
  const labelWidth = layout.labelEnd - layout.priorityWidth
  const codeText = fitTitle(code, labelWidth, 13)
  const titleText = fitTitle(title, Math.max(0, labelWidth - textWidth(codeText, 13) - (code === '' ? 0 : 6)), 13)
  const label = [
    `<text class="title" x="${layout.priorityWidth}" y="${mid + 4.5}" font-size="13">`,
    code === '' ? '' : `<tspan font-weight="700">${escapeXml(codeText)}</tspan>`,
    `<tspan class="${code === '' ? 'title' : 'muted'}" dx="${code === '' ? 0 : 6}">${escapeXml(titleText)}</tspan>`,
    '</text>',
  ].join('')

  const step = stageStep(task)
  let dots = ''
  for (let dot = 0; dot < STAGE_COUNT; dot++) {
    const cx = layout.stageX + 4 + dot * STAGE_DOT_GAP
    dots +=
      dot < step
        ? `<circle cx="${cx}" cy="${mid}" r="3.5" fill="${accent}"/>`
        : `<circle class="dot-empty" cx="${cx}" cy="${mid}" r="3" fill="none" stroke-width="1.2"/>`
  }
  const noStage = task.stage === null && task.status === 'doing'
  const name =
    layout.nameWidth > 0
      ? `<text class="${noStage ? 'flag-text' : 'title'}" x="${layout.stageX + STAGE_COUNT * STAGE_DOT_GAP + 4}" y="${mid + 4}" font-size="12">${escapeXml(stageName(task))}</text>`
      : ''

  const count = `<text class="muted" x="${layout.countEnd}" y="${mid + 4.5}" font-size="13" text-anchor="end">${escapeXml(criteriaText(task))}</text>`
  const age = ageText(task)
  const ageNode =
    layout.ageEnd !== null && age !== ''
      ? `<text class="muted" x="${layout.ageEnd}" y="${mid + 4}" font-size="12" text-anchor="end">${escapeXml(age)}</text>`
      : ''

  let flag = ''
  if (task.flags.length > 0 && layout.flagWidth > 0) {
    const text = layout.flagMark ? '!' : flagText(task)
    flag = [
      `<rect class="flag-chip" x="${layout.flagX}" y="${TRACK_Y + 2}" width="${layout.flagWidth}" height="${TRACK_HEIGHT - 4}" rx="${(TRACK_HEIGHT - 4) / 2}"/>`,
      `<text class="flag-text" x="${layout.flagX + layout.flagWidth / 2}" y="${mid + 4}" font-size="11" font-weight="600" text-anchor="middle">${escapeXml(text)}</text>`,
    ].join('')
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${ROW_HEIGHT}" viewBox="0 0 ${width} ${ROW_HEIGHT}" font-family="${FONT}">`,
    '<style>',
    '.title{fill:#ECECEC}.muted{fill:#9A9AA0}.track{fill:#2A2A2E}.tick{stroke:#5E5E66;stroke-width:2}',
    `.tick-fill{stroke:rgba(255,255,255,.75);stroke-width:2}.urgent{fill:${FLAG_COLOR}}.dot-empty{stroke:#6A6A72}`,
    `.flag-text{fill:${FLAG_COLOR}}.flag-chip{fill:${FLAG_COLOR};fill-opacity:.16}`,
    '@media (prefers-color-scheme: light){.title{fill:#1F1F22}.muted{fill:#6B6B72}.track{fill:#E6E6EA}.tick{stroke:#B8B8C0}.dot-empty{stroke:#A0A0A8}.flag-text{fill:#B4452F}.urgent{fill:#B4452F}}',
    '</style>',
    `<defs><clipPath id="track"><rect x="${trackX}" y="${TRACK_Y}" width="${trackWidth}" height="${TRACK_HEIGHT}" rx="${radius}"/></clipPath></defs>`,
    priority,
    label,
    dots,
    name,
    `<rect class="track" x="${trackX}" y="${TRACK_Y}" width="${trackWidth}" height="${TRACK_HEIGHT}" rx="${radius}"/>`,
    `<g clip-path="url(#track)">`,
    `<rect x="${trackX}" y="${TRACK_Y}" width="${fillWidth}" height="${TRACK_HEIGHT}" fill="${accent}" fill-opacity=".14"/>`,
    faint ? `<path d="${faint}" fill="${accent}" fill-opacity=".35"/>` : '',
    strong ? `<path d="${strong}" fill="${accent}" fill-opacity=".85"/>` : '',
    ticks,
    '</g>',
    count,
    ageNode,
    flag,
    '</svg>',
  ].join('')
}
