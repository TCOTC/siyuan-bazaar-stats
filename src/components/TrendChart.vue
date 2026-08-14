<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Chart, Options, SeriesOptionsType } from 'highcharts'
import Highcharts from '../lib/highcharts.ts'

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
  yMax?: number
  formatY?: (value: number) => string
}>()

const el = ref<HTMLElement>()
let chart: Chart | undefined

function seriesOptions(): SeriesOptionsType[] {
  return props.series.map((item) => ({
    type: props.stacked ? 'area' : 'spline',
    name: item.label,
    color: item.color,
    data: item.values.map((value, index) => [props.times[index]! * 1000, value]),
  }))
}

function buildOptions(): Options {
  const dark = document.documentElement.classList.contains('dark')
  const fg = dark ? '#ffffff' : '#171717'
  const muted = dark ? '#d4d4d4' : '#737373'
  const grid = dark ? '#404040' : '#e6e6e6'
  const formatY = props.formatY
  return {
    chart: {
      zooming: { type: 'x' },
      height: 320,
    },
    legend: {
      enabled: props.series.length > 1,
      itemStyle: { color: fg, fontWeight: 'normal' },
      itemHoverStyle: { color: fg },
    },
    xAxis: {
      type: 'datetime',
      lineColor: grid,
      tickColor: grid,
      labels: { style: { color: muted } },
      crosshair: true,
    },
    yAxis: {
      title: { text: undefined },
      max: props.yMax,
      min: props.yMax === undefined ? undefined : 0,
      gridLineColor: grid,
      labels: {
        style: { color: muted },
        formatter() {
          const value = typeof this.value === 'number' ? this.value : Number(this.value)
          return formatY?.(value) ?? String(this.value)
        },
      },
    },
    tooltip: {
      shared: true,
    },
    plotOptions: {
      area: {
        stacking: 'normal',
        lineWidth: 0,
        marker: { enabled: false },
        fillOpacity: 0.85,
      },
      spline: {
        marker: { radius: 3, symbol: 'circle' },
      },
    },
    series: seriesOptions(),
  }
}

function render() {
  if (!el.value || props.times.length < 2) {
    chart?.destroy()
    chart = undefined
    return
  }
  if (chart) {
    chart.update(buildOptions(), true, true)
    return
  }
  chart = Highcharts.chart(el.value, buildOptions())
}

onMounted(() => {
  render()
  window.addEventListener('themechange', render)
})

onUnmounted(() => {
  window.removeEventListener('themechange', render)
  chart?.destroy()
  chart = undefined
})

watch(
  () => [props.times, props.series, props.stacked, props.yMax] as const,
  () => nextTick(render),
  { deep: true },
)
</script>

<template>
  <section class="chart-card">
    <h3>{{ title }}</h3>
    <p v-if="times.length < 2" class="chart-empty">采集点还不够，稍后即可看到趋势。</p>
    <div v-show="times.length >= 2" ref="el" class="chart-host" />
  </section>
</template>
