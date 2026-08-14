<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  values: number[]
  color?: string
}>()

const width = 72
const height = 22
const points = computed(() => {
  if (props.values.length === 0) {
    return ''
  }
  const min = Math.min(...props.values)
  const max = Math.max(...props.values)
  const span = max - min
  const low = span === 0 ? min - 1 : min
  const high = span === 0 ? max + 1 : max
  return props.values.map((value, index) => {
    const x = props.values.length === 1 ? width / 2 : index * (width / (props.values.length - 1))
    const y = height - 1 - ((value - low) / (high - low || 1)) * (height - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})
</script>

<template>
  <svg
    v-if="values.length > 1"
    class="sparkline"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    aria-hidden="true"
  >
    <polyline
      fill="none"
      :stroke="color ?? 'currentColor'"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
      :points="points"
    />
  </svg>
</template>
