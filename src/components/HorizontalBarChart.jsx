/**
 * HORIZONTAL BAR CHART
 * ====================
 * One small wrapper around Recharts that every chart in this app uses:
 * the inventory stock chart, cargo by status, cargo by priority, and the
 * two charts on the dashboard. Five charts, one component — so they all
 * look the same, and a fix here fixes all of them.
 *
 * WHY THE BARS RUN SIDEWAYS
 * Our labels are things like "Cold Weather Sleeping Bags" and
 * "Snowmobile Spare Tracks". Standing those under vertical columns means
 * rotating them or cutting them short. Sideways bars give every label a
 * full line of ordinary left-to-right text, which is easier to read and
 * far easier to fit on a phone.
 *
 * WHAT YOU PASS IN
 *   data   [{ label, value, colour, note, tip }]
 *            label  - the name printed down the left. MUST BE UNIQUE
 *                     within one chart: Recharts groups bars by this
 *                     value, so two rows called the same thing would be
 *                     drawn as one bar.
 *            value  - how long the bar is
 *            colour - a plain colour string like '#ff6a3d'
 *            note   - short text printed at the end of the bar (optional)
 *            tip    - the line shown on hover (optional, falls back to note)
 *
 * WHY colour IS A PLAIN STRING AND NOT A CSS CLASS
 * See the TONE_COLOUR block in src/lib/statuses.js. Short version: an SVG
 * fill cannot read a CSS variable, so charts are given the literal colour.
 * Always pass statusColour(SOME_MAP, key) so a bar matches its badge.
 *
 * NO ENTRY ANIMATION, ON PURPOSE
 * Recharts grows bars from zero when they first appear. We turn that off
 * (isAnimationActive={false}). These charts are wired to live data: press
 * minus on an inventory item and the bar must simply be shorter. An
 * animation on every keystroke reads as decoration, and master prompt
 * section 20 asks us to keep motion to a minimum.
 */

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import StateBlock from './StateBlock'

/* The chart's own furniture. These read from CSS custom properties so they
   automatically follow the light/dark theme. Because Recharts draws SVG
   (which cannot use var() in fill attributes), we read the computed values
   at render time via getComputedStyle. */
function chartColors() {
  const s = getComputedStyle(document.documentElement)
  return {
    grid: s.getPropertyValue('--chart-grid').trim() || '#E2E8F0',
    label: s.getPropertyValue('--chart-label').trim() || '#0F172A',
    note: s.getPropertyValue('--chart-note').trim() || '#64748B',
    tick: s.getPropertyValue('--chart-tick').trim() || '#94A3B8',
    cursor: s.getPropertyValue('--chart-cursor').trim() || 'rgba(14, 165, 233, 0.06)',
    reference: s.getPropertyValue('--amber').trim() || '#F59E0B',
  }
}

/**
 * WHOLE-NUMBER TICKS FOR THE BOTTOM AXIS.
 *
 * Left to itself, Recharts chose 0, 2, 5 for a chart whose longest bar was
 * 5 — and drew the "2" at the two-and-a-half mark, because what it really
 * wanted was 0, 2.5, 5 with the decimals hidden. A gridline labelled 2 that
 * is not at 2 is worse than no gridline, so we pick the ticks ourselves.
 *
 * Aim for about four gaps, round the step up to a whole number, and extend
 * the axis to the next step so it always ends on a labelled line.
 *   longest bar 5  -> 0, 2, 4, 6
 *   longest bar 9  -> 0, 3, 6, 9
 *   longest bar 14 -> 0, 4, 8, 12, 16
 * An empty chart gets 0, 1 rather than 0, 0, which would collapse the axis.
 */
function wholeNumberTicks(values) {
  const highest = Math.max(0, ...values)
  const step = Math.max(1, Math.ceil(highest / 4))
  const top = Math.max(step, Math.ceil(highest / step) * step)
  const ticks = []
  for (let t = 0; t <= top; t += step) ticks.push(t)
  return { ticks, top }
}

/**
 * HOW MUCH ROOM THE END-OF-BAR FIGURES NEED.
 *
 * This is measured from the data, not trusted from the caller. The first
 * version took a fixed noteWidth and shrank it on a phone to protect the
 * bars — which cut "14,200/6,000" off mid-figure, on the one chart whose
 * legend promises those are the real quantities. A short bar is a small
 * loss; a cut-off number is a wrong number.
 *
 * The figures are monospaced, so every character is the same width and
 * counting characters is enough. 6.3px is a slightly generous estimate at
 * this text size, which is the safe direction to be wrong in. The caller's
 * noteWidth is kept as a floor so charts with no figures still get a gap.
 */
function noteMargin(data, floorWidth) {
  const longest = data.reduce((most, row) => Math.max(most, String(row.note ?? '').length), 0)
  return Math.max(floorWidth, Math.ceil(longest * 6.3) + 8)
}

/**
 * THE NAME DOWN THE LEFT — DRAWN BY US, NOT BY RECHARTS.
 *
 * Recharts' own axis label word-wraps to fit the width it is given. On a
 * phone that turned "Trauma / Frostbite Kits" into two lines:
 *
 *     Trauma / Frostbite
 *     …
 *
 * — the ellipsis stranded on a line of its own, and eleven of fourteen
 * labels two lines tall inside a 26px row. We already shorten the text
 * ourselves, so we draw it ourselves too: one line, no wrapping, ever.
 *
 * Recharts hands x, y, payload and textAnchor to whatever element is
 * passed as `tick`. dy="0.32em" is the usual nudge that moves text from
 * sitting ON the row's centre line to being centred across it.
 */
function AxisName({ x, y, payload, textAnchor = 'end', trim, fill }) {
  return (
    <text x={x} y={y} dy="0.32em" textAnchor={textAnchor} fill={fill} fontSize={11}>
      {trim(payload.value)}
    </text>
  )
}

/**
 * IS THE WINDOW NARROW?
 *
 * The strip of space reserved for the names on the left is a fixed number
 * of pixels — SVG has no equivalent of a percentage column. On a wide
 * screen 190px of names is comfortable; on a phone it would leave almost
 * nothing for the bars themselves. So on a narrow screen we take some of
 * that space back and let the longer names trim.
 *
 * One resize listener, removed again when the chart unmounts. 900px is the
 * point at which the console stops being a wide desktop layout.
 */
const WIDE_SCREEN = 900

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < WIDE_SCREEN)

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < WIDE_SCREEN)
    window.addEventListener('resize', check)
    check()
    return () => window.removeEventListener('resize', check)
  }, [])

  return narrow
}

/**
 * THE HOVER BOX.
 * Recharts' built-in tooltip is styled for a white page, so we give it our
 * own. `active` and `payload` are handed to us by Recharts; payload[0]
 * .payload is the original row from `data`, so we can show the note and
 * the exact colour of the bar being pointed at.
 */
function ChartTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null

  const row = payload[0].payload
  const c = chartColors()
  return (
    <div className="chart-tip">
      <div className="chart-tip__label">{row.label}</div>
      <div className="chart-tip__value" style={{ color: row.colour || c.label }}>
        {row.tip || row.note || row.value}
      </div>
    </div>
  )
}

export default function HorizontalBarChart({
  data = [],
  rowHeight = 26,
  minHeight = 150,
  maxValue,
  unitSuffix = '',
  reference,
  referenceLabel = '',
  labelWidth = 130,
  noteWidth = 52,
  emptyTitle = 'Nothing to chart',
  emptyMessage = 'No records to draw yet.',
}) {
  /* Asked BEFORE the empty-state check below, because React requires every
     hook to run on every render — a hook that is skipped some of the time
     is one of the few things React genuinely will not forgive. */
  const narrow = useNarrowScreen()

  /* Empty state, like every other data view in this app (section 15). */
  if (data.length === 0) {
    return <StateBlock kind="empty" title={emptyTitle} message={emptyMessage} />
  }

  /* On a narrow screen, claw back some of the space reserved for names so
     the bars stay visible. Charts that already ask for little (the cargo
     and dashboard ones, at 92px) are under this cap and are left alone.

     The space for the figures at the end of the bars is NOT capped — it is
     whatever the longest figure actually needs. See noteMargin above. */
  const nameWidth = narrow ? Math.min(labelWidth, 124) : labelWidth
  const figureWidth = noteMargin(data, noteWidth)

  /* ResponsiveContainer measures its own WIDTH, but it has to be told a
     height in pixels or it renders nothing. We grow it with the number of
     bars, so three bars are not stretched across the same space as
     fourteen and every bar stays the same thickness on every chart. */
  const height = Math.max(minHeight, data.length * rowHeight + 34)

  /* A long name would run into the bars, so trim it to what fits the strip
     reserved on the left. Names are set in the ordinary body font, where
     characters vary in width, so this is an estimate — 6.35px per character
     is a little wide on purpose, because a name that is one character too
     short is invisible while one that is too long is drawn over the panel
     edge. The full name is always in the hover box, so nothing is lost. */
  const maxChars = Math.floor((nameWidth - 8) / 6.35)
  const trimLabel = (text) => {
    const value = String(text ?? '')
    return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value
  }

  /* Percentage charts are given a fixed ceiling by the caller (maxValue),
     and Recharts' own 0/25/50/75/100 ticks are already sensible for those.
     Charts that count things get whole-number ticks worked out above. */
  const counted = maxValue ? null : wholeNumberTicks(data.map((row) => row.value))

  /* Read the current theme colours from CSS variables. This runs on every
     render, so a theme toggle immediately repaints the chart. */
  const c = chartColors()

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          /* Right margin is where the end-of-bar notes are printed. Without
             it they would be drawn past the edge and clipped away. */
          margin={{ top: referenceLabel ? 15 : 4, right: figureWidth, bottom: 2, left: 0 }}
          barCategoryGap={4}
        >
          {/* Vertical guides only. Horizontal ones would draw a line
              through every label for no benefit. */}
          <CartesianGrid horizontal={false} stroke={c.grid} />

          <XAxis
            type="number"
            domain={[0, maxValue || counted.top]}
            ticks={counted ? counted.ticks : undefined}
            allowDecimals={false}
            tick={{ fill: c.tick, fontSize: 10 }}
            tickFormatter={(v) => `${v}${unitSuffix}`}
            axisLine={false}
            tickLine={false}
          />

          {/* interval={0} forces EVERY label to be printed. Left to itself
              Recharts hides some when the list gets long, and a chart with
              missing labels is worse than no chart. The tick is our own
              one-line <text> — see AxisName above for why. */}
          <YAxis
            type="category"
            dataKey="label"
            width={nameWidth}
            interval={0}
            tick={<AxisName trim={trimLabel} fill={c.label} />}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<ChartTooltip />} cursor={{ fill: c.cursor }} />

          {/* The dashed threshold line — used by the inventory chart to
              mark where "minimum stock" sits. */}
          {Number.isFinite(reference) && (
            <ReferenceLine
              x={reference}
              stroke={c.reference}
              strokeDasharray="4 3"
              label={{ value: referenceLabel, position: 'top', fill: c.reference, fontSize: 10 }}
            />
          )}

          <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {/* One <Cell> per row is how Recharts lets each bar have its
                own colour instead of all of them sharing one. */}
            {data.map((row) => (
              <Cell key={row.label} fill={row.colour || c.label} />
            ))}
            <LabelList
              dataKey="note"
              position="right"
              fill={c.note}
              fontSize={10.5}
              className="mono"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
