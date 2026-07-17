<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';

const router = useRouter();

interface MistakeRow {
  scenario_id: string;
  step_index: number;
  title: string;
  icon: string;
  scam_type: string;
  category: string;
  total_count: number;
  wrong_count: number;
  wrong_rate: number;
}
interface Overview {
  scenarioCount: number;
  attemptCount: number;
  responseCount: number;
  avgScore: number;
}

const mistakes = ref<MistakeRow[]>([]);
const overview = ref<Overview | null>(null);
const loading = ref(true);
const filter = ref<string>('');

const categories = [
  { id: '', label: '全部' },
  { id: 'sms_call', label: '簡訊/電話' },
  { id: 'crypto_emerging', label: '加密/新興' },
  { id: 'social_media', label: '社群' },
];

const filtered = computed(() => {
  if (!filter.value) return mistakes.value;
  return mistakes.value.filter((m) => m.category === filter.value);
});

onMounted(load);

async function load() {
  try {
    const [mistakesData, overviewData] = await Promise.all([
      api.get<{ mistakes: MistakeRow[] }>(`/api/stats/common-mistakes?limit=20${filter.value ? '&category=' + filter.value : ''}`),
      api.get<{ overview: Overview }>('/api/stats/overview'),
    ]);
    mistakes.value = mistakesData.mistakes;
    overview.value = overviewData.overview;
  } finally {
    loading.value = false;
  }
}

async function setFilter(c: string) {
  filter.value = c;
  loading.value = true;
  await load();
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-1">🏆 最多人犯的錯</h1>
    <p class="text-sm text-slate-500 mb-4">看看大家在哪些題目最容易上鉤，提前避險！</p>

    <!-- 總覽 -->
    <div v-if="overview" class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
      <div class="card p-3 text-center">
        <div class="text-xl font-bold text-slate-700">{{ overview.scenarioCount }}</div>
        <div class="text-xs text-slate-400">情境數</div>
      </div>
      <div class="card p-3 text-center">
        <div class="text-xl font-bold text-slate-700">{{ overview.attemptCount }}</div>
        <div class="text-xs text-slate-400">總測驗</div>
      </div>
      <div class="card p-3 text-center">
        <div class="text-xl font-bold text-slate-700">{{ overview.responseCount }}</div>
        <div class="text-xs text-slate-400">總作答</div>
      </div>
      <div class="card p-3 text-center">
        <div class="text-xl font-bold text-slate-700">{{ overview.avgScore }}</div>
        <div class="text-xs text-slate-400">平均分</div>
      </div>
    </div>

    <!-- 類別篩選 -->
    <div class="flex gap-2 mb-4">
      <button
        v-for="c in categories"
        :key="c.id"
        class="text-xs px-3 py-1.5 rounded-full border transition"
        :class="filter === c.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200 text-slate-600'"
        @click="setFilter(c.id)"
      >
        {{ c.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center text-slate-400 py-10">載入中…</div>

    <div v-else-if="!filtered.length" class="card p-8 text-center text-slate-500">
      目前還沒有足夠的作答資料來產生排行榜。<br />
      多練習幾個情境，資料累積後這裡就會顯示最容易出錯的題目！
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(m, i) in filtered"
        :key="`${m.scenario_id}-${m.step_index}`"
        class="card p-4 flex items-center gap-4"
      >
        <div class="flex-none w-7 text-center">
          <div class="text-lg font-bold" :class="i < 3 ? 'text-brand-600' : 'text-slate-300'">{{ i + 1 }}</div>
        </div>
        <span class="text-3xl flex-none">{{ m.icon }}</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ m.title }}</div>
          <div class="text-xs text-slate-400">第 {{ m.step_index + 1 }} 步 · {{ m.scam_type }}</div>
        </div>
        <div class="text-right flex-none">
          <div class="text-lg font-bold text-red-500">{{ m.wrong_rate }}%</div>
          <div class="text-xs text-slate-400">{{ m.wrong_count }}/{{ m.total_count }} 錯</div>
        </div>
        <button class="btn-ghost !py-1.5 !px-3 text-xs flex-none" @click="router.push(`/quiz/${m.scenario_id}`)">
          挑戰
        </button>
      </div>
    </div>
  </div>
</template>
