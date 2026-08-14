<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { applyTheme, readTheme, toggleTheme, type ThemeMode } from '../lib/theme.ts'

const mode = ref<ThemeMode>('light')

onMounted(() => {
  mode.value = readTheme()
  applyTheme(mode.value)
})

function onToggle() {
  mode.value = toggleTheme()
}
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="mode === 'dark' ? '切换到浅色' : '切换到深色'"
    @click="onToggle"
  >
    <span class="theme-toggle__sun">
      <span class="theme-toggle__moon" :class="mode === 'dark' ? 'is-dark' : 'is-light'" />
    </span>
    <span class="theme-toggle__label">{{ mode === 'dark' ? '深色' : '浅色' }}</span>
  </button>
</template>
