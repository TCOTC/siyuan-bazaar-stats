<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Sparkline from '../components/Sparkline.vue'
import StarRating from '../components/StarRating.vue'
import { GOLD, PINK, TEAL } from '../lib/colors.ts'
import { formatAverage, formatDate, formatDateTime, formatDelta, formatNumber, formatRank, githubRepoURL, TYPE_LABELS } from '../lib/format.ts'
import { PACKAGE_TYPES } from '../lib/types.ts'
import type { PackageType, SiteSummary, SummaryPackage } from '../lib/types.ts'

const summary = ref<SiteSummary>()
const error = ref('')
const query = ref('')
const typeFilter = ref<PackageType | 'all'>('all')
const ratedOnly = ref(false)
const sortKey = ref<'updated' | 'rating' | 'count' | 'downloads' | 'delta' | 'name'>('updated')

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
    case 'count':
      return (right.rating?.count ?? 0) - (left.rating?.count ?? 0) ||
        (right.rating?.average ?? 0) - (left.rating?.average ?? 0)
    case 'downloads':
      return right.downloads - left.downloads
    case 'delta':
      return right.downloadDelta24h - left.downloadDelta24h
    case 'name':
      return left.displayName.localeCompare(right.displayName, 'zh-CN')
    default:
      if (!left.updatedAt && !right.updatedAt) {
        return right.downloads - left.downloads
      }
      if (!left.updatedAt) {
        return 1
      }
      if (!right.updatedAt) {
        return -1
      }
      return right.updatedAt - left.updatedAt || right.downloads - left.downloads
  }
}
</script>

<template>
  <section v-if="error" class="notice">无法加载统计数据：{{ error }}</section>
  <section v-else-if="!summary" class="notice">正在加载集市快照…</section>
  <template v-else>
    <section class="meter-strip">
      <article class="metric-cell">
        <small>集市包</small>
        <strong>{{ formatNumber(summary.totals.packages) }}</strong>
      </article>
      <article class="metric-cell">
        <small>有评分</small>
        <strong>{{ formatNumber(summary.totals.rated) }}</strong>
      </article>
      <article class="metric-cell">
        <small>评分人次</small>
        <strong>{{ formatNumber(summary.totals.ratings) }}</strong>
      </article>
      <article class="metric-cell">
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
        <option value="updated">按更新时间</option>
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
    <ol class="ranking">
      <li v-for="(pkg, index) in filtered" :key="pkg.name">
        <span class="rank-index">{{ formatRank(index) }}</span>
        <div class="pkg-identity">
          <img
            v-if="pkg.iconURL"
            :src="pkg.iconURL"
            :alt="pkg.displayName"
            width="36"
            height="36"
            loading="lazy"
            decoding="async"
          />
          <span class="pkg-copy">
            <RouterLink class="pkg-name" :to="{ name: 'package', params: { name: pkg.name } }">{{ pkg.displayName }}</RouterLink>
            <small>
              {{ pkg.type ? TYPE_LABELS[pkg.type] : '集市包' }}
              <template v-if="pkg.repo">
                ·
                <a
                  class="repo-link"
                  :href="githubRepoURL(pkg.repo)"
                  target="_blank"
                  rel="noreferrer"
                >{{ pkg.repo }}</a>
              </template>
              <template v-else> · {{ pkg.name }}</template>
              <template v-if="pkg.updatedAt"> · {{ formatDate(pkg.updatedAt) }}</template>
            </small>
          </span>
        </div>
        <div class="rank-metric">
          <template v-if="pkg.rating">
            <span class="metric-head">
              <span class="metric-value">{{ formatAverage(pkg.rating.average) }}</span>
              <StarRating :value="pkg.rating.average" />
            </span>
            <span class="muted">
              {{ formatNumber(pkg.rating.count) }} 人
              <template v-if="pkg.ratingCountDelta24h"> · {{ formatDelta(pkg.ratingCountDelta24h) }}</template>
            </span>
            <Sparkline :values="pkg.sparklineAverage" :color="GOLD" />
          </template>
          <span v-else class="muted">暂无评分</span>
        </div>
        <div class="rank-metric">
          <span class="metric-head">
            <span class="metric-value">{{ formatNumber(pkg.downloads) }}</span>
          </span>
          <span
            class="muted"
            :class="{ up: pkg.downloadDelta24h > 0, down: pkg.downloadDelta24h < 0 }"
          >{{ formatDelta(pkg.downloadDelta24h) }}</span>
          <Sparkline :values="pkg.sparklineDownloads" :color="pkg.downloadDelta24h < 0 ? PINK : TEAL" />
        </div>
      </li>
    </ol>
  </template>
</template>
