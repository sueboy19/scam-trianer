<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, type AttemptDetail } from '../lib/api';
import { useUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const attemptId = String(route.params.attemptId);
const isLocal = route.query.local === '1';

// 本地（未登入）結果：從 query 讀
const localScore = Number(route.query.score || 0);
const localTotal = Number(route.query.total || 0);
const localCorrect = Number(route.query.correct || 0);
const localTitle = String(route.query.title || '');
const localIcon = String(route.query.icon || '');

// 已登入結果：從後端 GET /api/attempts/:id 取
const detail = ref<AttemptDetail | null>(null);

const title = ref(localTitle);
const icon = ref(localIcon);
const score = ref(localScore);
const total = ref(localTotal);
const correct = ref(localCorrect);
const loading = ref(!isLocal);
const errorMsg = ref('');

const verdict = computed(() => {
  if (score.value >= 90) return { text: '防詐達人！🎉', color: 'text-green-600' };
  if (score.value >= 70) return { text: '很不錯，再加強 💪', color: 'text-emerald-600' };
  if (score.value >= 50) return { text: '及格邊緣，多練習 ⚠️', color: 'text-amber-600' };
  return { text: '需要多加練習 📚', color: 'text-red-600' };
});

onMounted(async () => {
  if (isLocal) return;
  try {
    const data = await api.get<AttemptDetail>(`/api/attempts/${attemptId}`);
    detail.value = data;
    title.value = data.scenario.title;
    icon.value = data.scenario.icon;
    score.value = data.attempt.score;
    total.value = data.attempt.totalSteps;
    correct.value = data.attempt.correctSteps;
  } catch (e) {
    errorMsg.value = (e as Error).message || '載入失敗';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-lg mx-auto py-6">
    <div v-if="loading" class="text-center text-slate-400">載入中…</div>

    <div v-else-if="errorMsg" class="card p-6 text-center text-red-600">
      {{ errorMsg }}
      <div class="mt-4">
        <RouterLink to="/" class="btn-primary inline-block">回到首頁</RouterLink>
      </div>
    </div>

    <div v-else>
      <!-- 分數卡 -->
      <div class="card p-8 text-center">
        <div class="text-6xl mb-2">{{ icon || '🛡️' }}</div>
        <h1 class="text-lg font-medium text-slate-600 mb-1">{{ title || '測驗完成' }}</h1>

        <div class="my-6">
          <div class="text-6xl font-bold" :class="verdict.color">{{ score }}</div>
          <div class="text-sm text-slate-400">分（滿分 100）</div>
        </div>

        <div :class="verdict.color" class="text-xl font-bold mb-4">{{ verdict.text }}</div>

        <div class="text-sm text-slate-500 mb-6">
          答對 {{ correct }} / {{ total }} 題
        </div>

        <div class="flex gap-3">
          <button class="btn-ghost flex-1" @click="router.back()">再試一次</button>
          <RouterLink to="/" class="btn-primary flex-1">挑戰其他情境</RouterLink>
        </div>

        <p v-if="!user.isLoggedIn" class="text-xs text-slate-400 mt-6">
          <RouterLink to="/login" class="underline">登入</RouterLink> 即可記錄成績並查看個人弱點
        </p>
      </div>

      <!-- 每題回顧（僅已登入、後端有完整資料時顯示） -->
      <div v-if="detail" class="mt-6">
        <h2 class="text-sm font-medium text-slate-500 mb-3 px-1">📝 每題回顧</h2>
        <div class="space-y-3">
          <div
            v-for="step in detail.review"
            :key="step.stepIndex"
            class="card p-4"
            :class="step.isCorrect ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-red-400'"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-slate-400">第 {{ step.stepIndex + 1 }} 步</span>
              <span v-if="step.isCorrect" class="text-xs text-green-600 font-medium">答對 ✓</span>
              <span v-else class="text-xs text-red-600 font-medium">答錯 ✗</span>
            </div>

            <p v-if="step.scenario" class="text-sm text-slate-600 mb-1">{{ step.scenario }}</p>
            <p v-if="step.dialogue" class="text-sm text-slate-800 bg-slate-50 rounded p-2 mb-3">{{ step.dialogue }}</p>

            <div class="space-y-1.5">
              <div
                v-for="(c, i) in step.choices"
                :key="i"
                class="text-sm px-3 py-2 rounded border"
                :class="[
                  c.correct ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 text-slate-600',
                  step.selectedIndex === i && !c.correct ? 'border-red-300 bg-red-50 text-red-700' : '',
                ]"
              >
                <span class="mr-1.5">
                  <template v-if="c.correct">✅</template>
                  <template v-else-if="step.selectedIndex === i">❌</template>
                  <template v-else>•</template>
                </span>
                {{ c.text }}
                <span v-if="step.selectedIndex === i" class="text-xs ml-1">(你的選擇)</span>
              </div>
            </div>

            <p
              v-if="step.selectedIndex !== null"
              class="text-xs text-slate-500 mt-3 leading-relaxed"
            >
              {{ step.choices[step.selectedIndex]?.explanation }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
