<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api, type ScenarioSummary } from '../lib/api';

const route = useRoute();
const category = String(route.params.category);
const scenarios = ref<ScenarioSummary[]>([]);
const loading = ref(true);

const meta: Record<string, { label: string; icon: string }> = {
  sms_call: { label: '簡訊 / 電話詐騙', icon: '📞' },
  crypto_emerging: { label: '加密貨幣 / 新興詐騙', icon: '🪙' },
  social_media: { label: '社群媒體詐騙', icon: '💬' },
};

onMounted(async () => {
  try {
    const data = await api.get<{ scenarios: ScenarioSummary[] }>(`/api/scenarios?category=${category}`);
    scenarios.value = data.scenarios;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <RouterLink to="/" class="text-sm text-slate-500 hover:text-slate-700">← 返回首頁</RouterLink>
    <h1 class="text-2xl font-bold mt-2 mb-4">
      <span class="mr-2">{{ meta[category]?.icon }}</span>{{ meta[category]?.label || category }}
    </h1>

    <div v-if="loading" class="text-center text-slate-400 py-10">載入中…</div>
    <div v-else-if="!scenarios.length" class="text-center text-slate-400 py-10">此類別尚無情境</div>
    <div v-else class="grid gap-3">
      <RouterLink
        v-for="s in scenarios"
        :key="s.id"
        :to="`/quiz/${s.id}`"
        class="card p-4 flex items-center gap-4 hover:shadow-md transition"
      >
        <span class="text-4xl">{{ s.icon }}</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium">{{ s.title }}</div>
          <div class="text-sm text-slate-500 line-clamp-2">{{ s.description }}</div>
          <div class="flex gap-2 mt-2">
            <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{{ s.scam_type }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">難度 {{ s.difficulty }}</span>
          </div>
        </div>
        <span class="text-brand-600 font-medium">開始 →</span>
      </RouterLink>
    </div>
  </div>
</template>
