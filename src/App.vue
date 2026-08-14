<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">思源集市统计</RouterLink>
      <p class="tagline">评分与下载量的公开快照 · 每 30 分钟采集一次</p>
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
      。
    </footer>
  </div>
</template>
