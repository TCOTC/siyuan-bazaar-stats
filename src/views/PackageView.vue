<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DistributionBars from '../components/DistributionBars.vue'
import StarRating from '../components/StarRating.vue'
import TrendChart from '../components/TrendChart.vue'
import { formatAverage, formatDateTime, formatNumber, githubRepoURL, TYPE_LABELS } from '../lib/format.ts'
import { ratingFromStats } from '../lib/rating.ts'
import type { PackageDetail } from '../lib/types.ts'

const props = defineProps<{ name: string }>()
const detail = ref<PackageDetail>()
const error = ref('')

async function load() {
  error.value = ''
  detail.value = undefined
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/packages/${encodeURIComponent(props.name)}.json`)
    if (!response.ok) {
      throw new Error(response.status === 404 ? '没有这个集市包的统计' : `HTTP ${response.status}`)
    }
    detail.value = await response.json() as PackageDetail
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败'
  }
}

onMounted(load)
watch(() => props.name, load)

const rating = computed(() => detail.value ? ratingFromStats(detail.value.current) : undefined)
const times = computed(() => detail.value?.history.map((point) => point.t) ?? [])
const distributionSeries = computed(() => [1, 2, 3, 4, 5].map((star) => ({
  label: `${star} 星`,
  color: ['#b45309', '#c4a35a', '#d4b96a', '#7c9a6d', '#3f6b4a'][star - 1]!,
  values: detail.value?.history.map((point) => point.x?.[star - 1] ?? 0) ?? [],
})))
</script>

<template>
  <p class="back">
    <RouterLink to="/">← 返回列表</RouterLink>
  </p>
  <section v-if="error" class="notice">{{ error }}</section>
  <section v-else-if="!detail" class="notice">正在加载 {{ name }}…</section>
  <template v-else>
    <section class="pkg-hero">
      <img v-if="detail.iconURL" class="pkg-icon" :src="detail.iconURL" :alt="detail.displayName" width="72" height="72" />
      <div>
        <p class="eyebrow">{{ detail.type ? TYPE_LABELS[detail.type] : '集市包' }}</p>
        <h1>{{ detail.displayName }}</h1>
        <p class="muted">{{ detail.name }} · {{ detail.author || '未知作者' }}</p>
        <p v-if="detail.description">{{ detail.description }}</p>
        <p v-if="detail.repo">
          <a :href="githubRepoURL(detail.repo)" target="_blank" rel="noreferrer">{{ detail.repo }}</a>
        </p>
      </div>
    </section>

    <section class="stats-grid">
      <article>
        <small>均分</small>
        <strong v-if="rating">
          {{ formatAverage(rating.average) }}
          <StarRating :value="rating.average" :size="18" />
        </strong>
        <strong v-else>—</strong>
      </article>
      <article>
        <small>评分人数</small>
        <strong>{{ formatNumber(rating?.count ?? 0) }}</strong>
      </article>
      <article>
        <small>下载量</small>
        <strong>{{ formatNumber(detail.current.d) }}</strong>
      </article>
      <article>
        <small>最近快照</small>
        <strong class="time">{{ detail.history.at(-1) ? formatDateTime(detail.history.at(-1)!.t) : '—' }}</strong>
      </article>
    </section>

    <section v-if="rating" class="panel">
      <h2>评分分布</h2>
      <DistributionBars :distribution="rating.distribution" />
    </section>
    <p v-else class="notice">这个包还没有公开评分。</p>

    <TrendChart
      title="平均分"
      :times="times"
      :series="[{ label: '均分', color: '#c4a35a', values: detail.history.map((point) => point.a ?? 0) }]"
      :format-y="(value) => value.toFixed(1)"
    />
    <TrendChart
      title="评分人数"
      :times="times"
      :series="[{ label: '人数', color: '#3f6b4a', values: detail.history.map((point) => point.c ?? 0) }]"
      :format-y="formatNumber"
    />
    <TrendChart
      title="评分分布趋势"
      stacked
      :times="times"
      :series="distributionSeries"
      :format-y="formatNumber"
    />
    <TrendChart
      title="下载量"
      :times="times"
      :series="[{ label: '下载', color: '#1c1917', values: detail.history.map((point) => point.d) }]"
      :format-y="formatNumber"
    />
  </template>
</template>
