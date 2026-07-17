<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, type ScenarioSummary } from '../lib/api';

const router = useRouter();
const scenarios = ref<ScenarioSummary[]>([]);
const loading = ref(true);

const categories = [
  { id: 'sms_call', label: '簡訊 / 電話詐騙', icon: '📞', desc: '假網拍、猜猜我是誰、假檢警、釣魚簡訊', color: 'bg-rose-50 border-rose-200' },
  { id: 'crypto_emerging', label: '加密貨幣 / 新興', icon: '🪙', desc: '虛擬貨幣投資、AI 深偽、殺豬盤、假客服', color: 'bg-amber-50 border-amber-200' },
  { id: 'social_media', label: '社群媒體詐騙', icon: '💬', desc: '帳號盜用、釣魚連結、一頁式廣告、假抽獎', color: 'bg-sky-50 border-sky-200' },
] as const;

const counts = ref<Record<string, number>>({});

onMounted(async () => {
  try {
    const data = await api.get<{ scenarios: ScenarioSummary[] }>('/api/scenarios');
    scenarios.value = data.scenarios;
    for (const s of data.scenarios) {
      counts.value[s.category] = (counts.value[s.category] || 0) + 1;
    }
  } finally {
    loading.value = false;
  }
});

function go(c: string) {
  router.push(`/category/${c}`);
}
</script>

<template>
  <div>
    <section class="card p-6 mb-6 bg-gradient-to-br from-brand-50 to-white">
      <h1 class="text-2xl font-bold mb-2">一起成為防詐達人 🛡️</h1>
      <p class="text-slate-600 leading-relaxed">
        透過擬真情境練習，學會辨識各種詐騙手法。每完成一個情境就會計分，
        登入後還能看到自己的弱點，以及「最多人犯的錯」排行榜，一起進步！
      </p>
    </section>

    <h2 class="text-lg font-bold mb-3">選擇練習類別</h2>
    <div class="grid gap-4 sm:grid-cols-3">
      <button
        v-for="c in categories"
        :key="c.id"
        class="card p-5 text-left border-2 transition hover:scale-[1.02]"
        :class="c.color"
        @click="go(c.id)"
      >
        <div class="text-4xl mb-2">{{ c.icon }}</div>
        <div class="font-bold text-base mb-1">{{ c.label }}</div>
        <div class="text-xs text-slate-500 mb-3">{{ c.desc }}</div>
        <div class="text-xs font-medium text-slate-700">
          {{ counts[c.id] || 0 }} 個情境
        </div>
      </button>
    </div>

    <div v-if="loading" class="text-center text-slate-400 mt-8">載入中…</div>

    <section v-else-if="scenarios.length" class="mt-8">
      <h2 class="text-lg font-bold mb-3">最新情境</h2>
      <div class="grid gap-3">
        <RouterLink
          v-for="s in scenarios.slice(0, 4)"
          :key="s.id"
          :to="`/quiz/${s.id}`"
          class="card p-4 flex items-center gap-3 hover:shadow-md transition"
        >
          <span class="text-3xl">{{ s.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ s.title }}</div>
            <div class="text-xs text-slate-500 truncate">{{ s.description }}</div>
          </div>
          <span class="text-brand-600 text-sm font-medium">開始 →</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
