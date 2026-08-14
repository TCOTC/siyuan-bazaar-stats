<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatDateTime } from '../lib/format.ts'

export type ChartSeries = {
  label: string
  color: string
  values: number[]
}

const props = defineProps<{
  title: string
  times: number[]
  series: ChartSeries[]
  stacked?: boolean
  formatY?: (value: number) => string
}>()

const width = 720
const height = 260
const pad = { top: 16, right: 16, bottom: 36, left: 52 }
const hover = ref<number | null>(null)

const plotWidth = width - pad.left - pad.right
const plotHeight = height - pad.top - pad.bottom

const stackedValues = computed(() => {
  if (!props.stacked) {
    return props.series.map((item) => item.values)
  }
  const totals: number[][] = []
  let previous = Array.from({ length: props.times.length }, () => 0)
  for (const item of props.series) {
    const layer = item.values.map((value, index) => previous[index]! + value)
    totals.push(layer)
    previous = layer
  }
  return totals
})

const yMax = computed(() => {
  const values = stackedValues.value.flat()
  const max = Math.max(0, ...values)
  if (max <= 1) {
    return 5
  }
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / magnitude) * magnitude
})

function xOf(index: number): number {
  if (props.times.length <= 1) {
    return pad.left + plotWidth / 2
  }
  return pad.left + index * plotWidth / (props.times.length - 1)
}

function yOf(value: number): number {
  return pad.top + plotHeight - (value / (yMax.value || 1)) * plotHeight
}

const yTicks = computed(() => {
  const ticks = 4
  return Array.from({ length: ticks + 1 }, (_, index) => yMax.value * index / ticks)
})

const xTicks = computed(() => {
  if (props.times.length === 0) {
    return []
  }
  const count = Math.min(6, props.times.length)
  return Array.from({ length: count }, (_, index) => {
    const i = Math.round(index * (props.times.length - 1) / Math.max(1, count - 1))
    return { index: i, time: props.times[i]! }
  })
})

function areaPath(top: number[], bottom: number[]): string {
  if (top.length === 0) {
    return ''
  }
  const forward = top.map((value, index) => `${index === 0 ? 'M' : 'L'}${xOf(index)} ${yOf(value)}`).join(' ')
  const backward = [...bottom].reverse().map((value, index) => {
    const sourceIndex = bottom.length - 1 - index
    return `L${xOf(sourceIndex)} ${yOf(value)}`
  }).join(' ')
  return `${forward} ${backward} Z`
}

function linePath(values: number[]): string {
  return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${xOf(index)} ${yOf(value)}`).join(' ')
}

function onMove(event: MouseEvent) {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const svgX = (event.clientX - rect.left) / rect.width * width
  let nearest = 0
  let best = Infinity
  for (let i = 0; i < props.times.length; i++) {
    const distance = Math.abs(xOf(i) - svgX)
    if (distance < best) {
      best = distance
      nearest = i
    }
  }
  hover.value = nearest
}

const tooltip = computed(() => {
  if (hover.value === null || !props.times[hover.value]) {
    return undefined
  }
  const index = hover.value
  return {
    x: Math.min(width - 180, Math.max(pad.left, xOf(index) + 8)),
    y: pad.top + 8,
    time: props.times[index]!,
    rows: props.series.map((item) => ({
      label: item.label,
      color: item.color,
      value: item.values[index] ?? 0,
    })),
  }
})

const formatY = (value: number) => props.formatY?.(value) ?? String(value)
</script>

<template>
  <section class="chart-card">
    <h3>{{ title }}</h3>
    <p v-if="times.length < 2" class="chart-empty">采集点还不够，稍后即可看到趋势。</p>
    <svg
      v-else
      class="chart"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="title"
      @mousemove="onMove"
      @mouseleave="hover = null"
    >
      <line
        v-for="tick in yTicks"
        :key="tick"
        :x1="pad.left"
        :x2="width - pad.right"
        :y1="yOf(tick)"
        :y2="yOf(tick)"
        class="chart-grid"
      />
      <text
        v-for="tick in yTicks"
        :key="`y-${tick}`"
        :x="pad.left - 8"
        :y="yOf(tick) + 4"
        class="chart-axis"
        text-anchor="end"
      >{{ formatY(tick) }}</text>
      <text
        v-for="tick in xTicks"
        :key="`x-${tick.index}`"
        :x="xOf(tick.index)"
        :y="height - 10"
        class="chart-axis"
        text-anchor="middle"
      >{{ formatDate(tick.time) }}</text>
      <template v-if="stacked">
        <path
          v-for="(item, index) in [...series].reverse()"
          :key="item.label"
          :d="areaPath(
            stackedValues[series.length - 1 - index] ?? [],
            stackedValues[series.length - 2 - index] ?? Array.from({ length: times.length }, () => 0),
          )"
          :fill="item.color"
          fill-opacity="0.85"
        />
      </template>
      <template v-else>
        <path
          v-for="item in series"
          :key="item.label"
          :d="linePath(item.values)"
          fill="none"
          :stroke="item.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </template>
      <line
        v-if="hover !== null"
        :x1="xOf(hover)"
        :x2="xOf(hover)"
        :y1="pad.top"
        :y2="height - pad.bottom"
        class="chart-hover"
      />
      <foreignObject
        v-if="tooltip"
        :x="tooltip.x"
        :y="tooltip.y"
        width="170"
        height="160"
      >
        <div class="chart-tooltip">
          <strong>{{ formatDateTime(tooltip.time) }}</strong>
          <p v-for="row in tooltip.rows" :key="row.label">
            <i :style="{ background: row.color }" />
            {{ row.label }} {{ formatY(row.value) }}
          </p>
        </div>
      </foreignObject>
    </svg>
  </section>
</template>
