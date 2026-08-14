<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import DistributionBars from '../components/DistributionBars.vue'
import StarRating from '../components/StarRating.vue'
import TrendChart from '../components/TrendChart.vue'
import { GOLD, PINK, STAR_COLORS, TEAL } from '../lib/colors.ts'
import { formatAverage, formatDate, formatDateTime, formatNumber, githubRepoURL, TYPE_LABELS } from '../lib/format.ts'
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
const ratingHistory = computed(() => detail.value?.history.filter((point) => point.a !== undefined) ?? [])
const ratingTimes = computed(() => ratingHistory.value.map((point) => point.t))
const distributionSeries = computed(() => [1, 2, 3, 4, 5].map((star) => ({
  label: `${star} 星`,
  color: STAR_COLORS[star - 1]!,
  values: ratingHistory.value.map((point) => point.x?.[star - 1] ?? 0),
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
      <p class="kicker">{{ detail.type ? TYPE_LABELS[detail.type] : '集市包' }}</p>
      <div class="pkg-heading">
        <img
          v-if="detail.iconURL"
          class="pkg-icon"
          :src="detail.iconURL"
          :alt="detail.displayName"
          width="56"
          height="56"
          loading="lazy"
          decoding="async"
        />
        <div class="pkg-heading-text">
          <h1>{{ detail.displayName }}</h1>
          <p class="muted">{{ detail.name }} · {{ detail.author || '未知作者' }}<template v-if="detail.updatedAt"> · {{ formatDate(detail.updatedAt) }} 更新</template></p>
        </div>
      </div>
      <p v-if="detail.description">{{ detail.description }}</p>
      <p v-if="detail.repo" class="pkg-repo">
        <a :href="githubRepoURL(detail.repo)" target="_blank" rel="noreferrer">{{ detail.repo }}</a>
      </p>
    </section>

    <section class="meter-strip">
      <article class="metric-cell">
        <small>均分</small>
        <div class="metric-main">
          <strong>{{ rating ? formatAverage(rating.average) : '—' }}</strong>
          <StarRating v-if="rating" :value="rating.average" :size="18" />
        </div>
      </article>
      <article class="metric-cell">
        <small>评分人数</small>
        <strong>{{ formatNumber(rating?.count ?? 0) }}</strong>
      </article>
      <article class="metric-cell">
        <small>下载量</small>
        <strong>{{ formatNumber(detail.current.d) }}</strong>
      </article>
      <article class="metric-cell">
        <small>最近快照</small>
        <strong class="time">{{ detail.history.at(-1) ? formatDateTime(detail.history.at(-1)!.t) : '—' }}</strong>
      </article>
    </section>

    <section v-if="rating" class="panel">
      <h2>评分分布</h2>
      <DistributionBars :distribution="rating.distribution" />
    </section>
    <p v-else class="notice">这个包还没有公开评分。</p>

    <template v-if="ratingTimes.length >= 2">
      <TrendChart
        title="平均分"
        :times="ratingTimes"
        :series="[{ label: '均分', color: TEAL, values: ratingHistory.map((point) => point.a ?? 0) }]"
        :format-y="(value) => value.toFixed(1)"
        :y-max="5"
      />
      <TrendChart
        title="评分人数"
        :times="ratingTimes"
        :series="[{ label: '人数', color: PINK, values: ratingHistory.map((point) => point.c ?? 0) }]"
        :format-y="formatNumber"
      />
      <TrendChart
        title="评分分布趋势"
        stacked
        :times="ratingTimes"
        :series="distributionSeries"
        :format-y="formatNumber"
      />
    </template>
    <p v-else-if="rating" class="notice">评分还没有足够的历史点，暂时看不到趋势。</p>
    <TrendChart
      title="下载量"
      :times="times"
      :series="[{ label: '下载', color: GOLD, values: detail.history.map((point) => point.d) }]"
      :format-y="formatNumber"
    />
  </template>
</template>
