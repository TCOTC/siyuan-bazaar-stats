<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../lib/format.ts'
import type { RatingDistribution } from '../lib/types.ts'

const props = defineProps<{
  distribution: RatingDistribution
}>()

const total = computed(() => props.distribution.reduce((sum, value) => sum + value, 0))
const rows = computed(() => [5, 4, 3, 2, 1].map((star) => {
  const count = props.distribution[star - 1] ?? 0
  return {
    star,
    count,
    ratio: total.value > 0 ? count / total.value : 0,
  }
}))
</script>

<template>
  <ul class="dist-bars">
    <li v-for="row in rows" :key="row.star" class="dist-row">
      <span class="dist-label">{{ row.star }} 星</span>
      <span class="dist-track">
        <span class="dist-fill" :class="`star-${row.star}`" :style="{ width: `${row.ratio * 100}%` }" />
      </span>
      <span class="dist-count">{{ formatNumber(row.count) }}</span>
    </li>
  </ul>
</template>
