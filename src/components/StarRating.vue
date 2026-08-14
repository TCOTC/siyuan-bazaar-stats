<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  size?: number
}>(), {
  size: 16,
})

const stars = [1, 2, 3, 4, 5]

function fill(star: number): number {
  return Math.min(1, Math.max(0, props.value - (star - 1)))
}
</script>

<template>
  <span class="stars" :style="{ '--star-size': `${size}px` }" :aria-label="`${value.toFixed(1)} 分`">
    <span v-for="star in stars" :key="star" class="star">
      <span class="star-fill" :style="{ width: `${fill(star) * 100}%` }">★</span>
      <span class="star-empty">★</span>
    </span>
  </span>
</template>
