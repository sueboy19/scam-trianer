<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../lib/api';
import { useUserStore } from '../stores/user';

const user = useUserStore();

interface HistoryRow {
  id: string;
  scenario_id: string;
  title: string;
  icon: string;
  scam_type: string;
  category: string;
  score: number;
  total_steps: number;
  correct_steps: number;
  started_at: number;
  completed_at: number;
}
interface BestRow {
  scenario_id: string;
  best_score: number;
  attempts_count: number;
}

const history = ref<HistoryRow[]>([]);
const best = ref<BestRow[]>([]);
const loading = ref(true);

onMounted(async () => {
  if (!user.isLoggedIn) {
    loading.value = false;
    return;
  }
  try {
    const data = await api.get<{ history: HistoryRow[]; best: BestRow[] }>('/api/history?limit=50');
    history.value = data.history;
    best.value = data.best;
  } finally {
    loading.value = false;
  }
});

function fmtTime(t: number) {
  return new Date(t).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">📊 我的練習紀錄</h1>

    <div v-if="!user.isLoggedIn" class="card p-8 text-center text-slate-500">
      <p class="mb-3">登入後才能記錄與查看個人練習歷史。</p>
      <RouterLink to="/login" class="btn-primary inline-flex">前往登入</RouterLink>
    </div>

    <div v-else-if="loading" class="text-center text-slate-400 py-10">載入中…</div>

    <div v-else-if="!history.length" class="card p-8 text-center text-slate-500">
      你還沒有任何練習紀錄，<RouterLink to="/" class="text-brand-600 underline">開始第一個情境</RouterLink> 吧！
    </div>

    <div v-else>
      <!-- 最佳成績概覽 -->
      <h2 class="text-sm font-bold text-slate-500 mb-2">各情境最佳成績</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        <div v-for="b in best" :key="b.scenario_id" class="card p-3 text-center">
          <div class="text-2xl font-bold" :class="b.best_score >= 70 ? 'text-green-600' : 'text-amber-600'">
            {{ b.best_score }}
          </div>
          <div class="text-xs text-slate-400">挑戰 {{ b.attempts_count }} 次</div>
        </div>
      </div>

      <!-- 歷史列表 -->
      <h2 class="text-sm font-bold text-slate-500 mb-2">最近練習</h2>
      <div class="space-y-2">
        <div v-for="h in history" :key="h.id" class="card p-3 flex items-center gap-3">
          <span class="text-2xl">{{ h.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ h.title }}</div>
            <div class="text-xs text-slate-400">{{ fmtTime(h.completed_at) }}</div>
          </div>
          <div class="text-right">
            <div class="font-bold" :class="h.score >= 70 ? 'text-green-600' : 'text-amber-600'">{{ h.score }}</div>
            <div class="text-xs text-slate-400">{{ h.correct_steps }}/{{ h.total_steps }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
