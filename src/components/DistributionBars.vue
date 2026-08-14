<script setup lang="ts">
import { computed } from 'vue'
import { STAR_COLORS } from '../lib/colors.ts'
import { formatNumber } from '../lib/format.ts'
import type { RatingDistribution } from '../lib/types.ts'

const props = defineProps<{
  distribution: RatingDistribution
}>()

const total = computed(() => props.distribution.reduce((sum, value) => sum + value, 0))
const bars = computed(() => [1, 2, 3, 4, 5].map((star) => {
  const count = props.distribution[star - 1] ?? 0
  const ratio = total.value > 0 ? count / total.value : 0
  return {
    star,
    count,
    color: STAR_COLORS[star - 1],
    height: count === 0 ? '0.2rem' : `${Math.max(12, ratio * 100)}%`,
  }
}))
</script>

<template>
  <div class="score-bars">
    <div
      v-for="bar in bars"
      :key="bar.star"
      class="score-bar"
      :style="{ '--bar-color': bar.color, '--bar-height': bar.height }"
    >
      <span />
      <small>{{ bar.star }} 星</small>
      <em>{{ formatNumber(bar.count) }}</em>
    </div>
  </div>
</template>
