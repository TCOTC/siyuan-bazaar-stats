<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Sparkline from '../components/Sparkline.vue'
import StarRating from '../components/StarRating.vue'
import { PACKAGE_TYPES } from '../lib/types.ts'
import type { PackageType, SiteSummary, SummaryPackage } from '../lib/types.ts'
import { formatAverage, formatDateTime, formatDelta, formatNumber, TYPE_LABELS } from '../lib/format.ts'

const summary = ref<SiteSummary>()
const error = ref('')
const query = ref('')
const typeFilter = ref<PackageType | 'all'>('all')
const ratedOnly = ref(false)
const sortKey = ref<'rating' | 'count' | 'downloads' | 'delta' | 'name'>('count')

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/summary.json`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    summary.value = await response.json() as SiteSummary
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败'
  }
})

const filtered = computed(() => {
  const data = summary.value?.packages ?? []
  const keyword = query.value.trim().toLowerCase()
  const list = data.filter((pkg) => {
    if (typeFilter.value !== 'all' && pkg.type !== typeFilter.value) {
      return false
    }
    if (ratedOnly.value && !pkg.rating) {
      return false
    }
    if (!keyword) {
      return true
    }
    return [pkg.name, pkg.displayName, pkg.author, pkg.repo].join(' ').toLowerCase().includes(keyword)
  })
  return [...list].sort(comparePackages)
})

function comparePackages(left: SummaryPackage, right: SummaryPackage): number {
  switch (sortKey.value) {
    case 'rating':
      return (right.rating?.average ?? -1) - (left.rating?.average ?? -1) ||
        (right.rating?.count ?? 0) - (left.rating?.count ?? 0)
    case 'downloads':
      return right.downloads - left.downloads
    case 'delta':
      return right.downloadDelta24h - left.downloadDelta24h
    case 'name':
      return left.displayName.localeCompare(right.displayName, 'zh-CN')
    default:
      return (right.rating?.count ?? 0) - (left.rating?.count ?? 0) ||
        (right.rating?.average ?? 0) - (left.rating?.average ?? 0)
  }
}
</script>

<template>
  <section v-if="error" class="notice">无法加载统计数据：{{ error }}</section>
  <section v-else-if="!summary" class="notice">正在加载集市快照…</section>
  <template v-else>
    <section class="stats-grid">
      <article>
        <small>集市包</small>
        <strong>{{ formatNumber(summary.totals.packages) }}</strong>
      </article>
      <article>
        <small>有评分</small>
        <strong>{{ formatNumber(summary.totals.rated) }}</strong>
      </article>
      <article>
        <small>评分人次</small>
        <strong>{{ formatNumber(summary.totals.ratings) }}</strong>
      </article>
      <article>
        <small>总下载</small>
        <strong>{{ formatNumber(summary.totals.downloads) }}</strong>
      </article>
    </section>
    <p class="updated">索引发布时间 {{ formatDateTime(summary.publishedAt) }}</p>

    <section class="toolbar">
      <input v-model="query" type="search" placeholder="搜索名称、作者或仓库" />
      <select v-model="typeFilter">
        <option value="all">全部类型</option>
        <option v-for="type in PACKAGE_TYPES" :key="type" :value="type">{{ TYPE_LABELS[type] }}</option>
      </select>
      <select v-model="sortKey">
        <option value="count">按评分数</option>
        <option value="rating">按均分</option>
        <option value="downloads">按下载量</option>
        <option value="delta">按近 24 小时下载变化</option>
        <option value="name">按名称</option>
      </select>
      <label class="check">
        <input v-model="ratedOnly" type="checkbox" />
        仅显示有评分
      </label>
    </section>

    <p class="result-count">{{ formatNumber(filtered.length) }} 个包</p>
    <div class="table-wrap">
      <table class="pkg-table">
        <thead>
          <tr>
            <th>包</th>
            <th>类型</th>
            <th>评分</th>
            <th>下载</th>
            <th>近 24 小时下载</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in filtered" :key="pkg.name">
            <td>
              <RouterLink class="pkg-link" :to="{ name: 'package', params: { name: pkg.name } }">
                <img
                  v-if="pkg.iconURL"
                  :src="pkg.iconURL"
                  :alt="pkg.displayName"
                  width="28"
                  height="28"
                  loading="lazy"
                  decoding="async"
                />
                <span>
                  <strong>{{ pkg.displayName }}</strong>
                  <small>{{ pkg.name }}</small>
                </span>
              </RouterLink>
            </td>
            <td>{{ pkg.type ? TYPE_LABELS[pkg.type] : '—' }}</td>
            <td>
              <template v-if="pkg.rating">
                <StarRating :value="pkg.rating.average" />
                <span class="muted">
                  {{ formatAverage(pkg.rating.average) }} · {{ formatNumber(pkg.rating.count) }} 人
                  <template v-if="pkg.ratingCountDelta24h">
                    · {{ formatDelta(pkg.ratingCountDelta24h) }}
                  </template>
                </span>
                <Sparkline :values="pkg.sparklineAverage" color="var(--gold)" />
              </template>
              <span v-else class="muted">暂无</span>
            </td>
            <td>
              <span class="metric-value">{{ formatNumber(pkg.downloads) }}</span>
              <Sparkline :values="pkg.sparklineDownloads" />
            </td>
            <td :class="{ up: pkg.downloadDelta24h > 0, down: pkg.downloadDelta24h < 0 }">
              {{ formatDelta(pkg.downloadDelta24h) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>
