<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'
import { SITE_REPO_URL } from './lib/constants.ts'

const route = useRoute()
const isHome = computed(() => route.name === 'home')
</script>

<template>
  <div class="app-shell">
    <div class="site-bar">
      <RouterLink class="brand" to="/">思源集市统计</RouterLink>
      <div class="site-bar-end">
        <a class="source-link" :href="SITE_REPO_URL" target="_blank" rel="noreferrer">仓库</a>
        <ThemeToggle />
      </div>
    </div>
    <header v-if="isHome" class="hero-grid">
      <div class="hero-copy">
        <p class="kicker">Bazaar snapshot</p>
        <h1>思源集市统计</h1>
        <p class="lede">跟踪集市包的评分与下载量。</p>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
    <footer class="site-footer">
      数据来自
      <a href="https://bazaar.b3logfile.com/bazaar/index.json" target="_blank" rel="noreferrer">集市公开索引</a>
      。官方不保存历史，本站自行跟踪计数。
      见
      <a href="https://github.com/siyuan-note/siyuan/issues/16711" target="_blank" rel="noreferrer">siyuan#16711</a>
      。源码在
      <a :href="SITE_REPO_URL" target="_blank" rel="noreferrer">GitHub</a>
      。趋势图使用
      <a href="https://www.highcharts.com" target="_blank" rel="noreferrer">Highcharts</a>
      个人非商业许可。
    </footer>
  </div>
</template>
