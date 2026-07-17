<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, type ScenarioDetail, type AttemptResult } from '../lib/api';
import { useUserStore } from '../stores/user';
import ScenarioView from '../components/ScenarioView.vue';
import ChoiceButton from '../components/ChoiceButton.vue';
import FeedbackCard from '../components/FeedbackCard.vue';

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const id = String(route.params.id);

const scenario = ref<ScenarioDetail | null>(null);
const loading = ref(true);
const error = ref('');

const stepIdx = ref(0);
const selectedIdx = ref<number | null>(null);
const responses = ref<Array<{ stepIndex: number; choiceIndex: number; isCorrect: boolean }>>([]);
const submitting = ref(false);
const startedAt = Date.now();

const currentStep = computed(() => scenario.value?.steps[stepIdx.value] ?? null);
const revealed = computed(() => selectedIdx.value !== null);
const isLast = computed(() => scenario.value ? stepIdx.value === scenario.value.steps.length - 1 : false);
const correctCount = computed(() => responses.value.filter((r) => r.isCorrect).length);
const progress = computed(() =>
  scenario.value ? Math.round(((stepIdx.value + (revealed.value ? 1 : 0)) / scenario.value.steps.length) * 100) : 0
);

onMounted(load);

async function load() {
  try {
    const data = await api.get<{ scenario: ScenarioDetail }>(`/api/scenarios/${id}`);
    scenario.value = data.scenario;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function choose(i: number) {
  if (revealed.value) return;
  const step = currentStep.value!;
  const choice = step.choices[i];
  selectedIdx.value = i;
  responses.value.push({
    stepIndex: step.stepIndex,
    choiceIndex: i,
    isCorrect: choice.correct,
  });
}

function next() {
  if (!isLast.value) {
    stepIdx.value++;
    selectedIdx.value = null;
  } else {
    finish();
  }
}

async function finish() {
  if (!scenario.value) return;
  submitting.value = true;

  // 未登入：不送後端，直接帶本地結果到 result 頁（用 query 傳遞）
  if (!user.isLoggedIn) {
    router.push({
      name: 'result',
      params: { attemptId: 'local' },
      query: {
        local: '1',
        title: scenario.value.title,
        icon: scenario.value.icon,
        score: String(Math.round((correctCount.value / scenario.value.steps.length) * 100)),
        total: String(scenario.value.steps.length),
        correct: String(correctCount.value),
      },
    });
    return;
  }

  // 已登入：送後端記錄
  try {
    const data = await api.post<AttemptResult>('/api/attempts', {
      scenarioId: scenario.value.id,
      startedAt,
      responses: responses.value,
    });
    router.push({ name: 'result', params: { attemptId: data.attempt.id } });
  } catch (e) {
    alert('儲存失敗：' + (e as Error).message);
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center text-slate-400 py-10">載入中…</div>
    <div v-else-if="error" class="card p-6 text-center text-red-600">{{ error }}</div>

    <div v-else-if="scenario && currentStep">
      <!-- 標題列 -->
      <div class="flex items-center justify-between mb-3">
        <RouterLink :to="`/category/${scenario.category}`" class="text-sm text-slate-500 hover:text-slate-700">← 返回列表</RouterLink>
        <span class="text-xs text-slate-400">第 {{ stepIdx + 1 }} / {{ scenario.steps.length }} 步</span>
      </div>

      <!-- 進度條 -->
      <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div class="h-full bg-brand-500 transition-all duration-300" :style="{ width: progress + '%' }" />
      </div>

      <div class="card p-5 mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">{{ scenario.icon }}</span>
          <span class="font-medium">{{ scenario.title }}</span>
        </div>

        <!-- 情境呈現 -->
        <ScenarioView :step="currentStep" />

        <!-- 選項 -->
        <div class="space-y-2 mt-4">
          <ChoiceButton
            v-for="(c, i) in currentStep.choices"
            :key="i"
            :choice="c"
            :index="i"
            :revealed="revealed"
            :selected="selectedIdx === i"
            @choose="choose"
          />
        </div>

        <!-- 回饋 -->
        <div v-if="revealed && selectedIdx !== null" class="mt-4">
          <FeedbackCard :selected-choice="currentStep.choices[selectedIdx]" :correct="currentStep.choices[selectedIdx].correct" />
          <button class="btn-primary w-full mt-4" :disabled="submitting" @click="next">
            {{ isLast ? '查看結果' : '下一步 →' }}
          </button>
        </div>
      </div>

      <p v-if="!user.isLoggedIn" class="text-center text-xs text-slate-400">
        💡 未登入，本次成績不會記錄。<RouterLink to="/login" class="underline">登入以記錄</RouterLink>
      </p>
    </div>
  </div>
</template>
