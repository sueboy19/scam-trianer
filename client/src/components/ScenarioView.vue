<script setup lang="ts">
import { computed } from 'vue';
import type { Step } from '../lib/api';

const props = defineProps<{ step: Step }>();

// 依 uiType 決定呈現風格
const variant = computed(() => props.step.uiType);
</script>

<template>
  <div class="mb-4">
    <!-- 情境說明文字 -->
    <p class="text-sm text-slate-500 mb-3">{{ step.scenario }}</p>

    <!-- 來電畫面 -->
    <div v-if="variant === 'phone_call'" class="bg-slate-900 text-white rounded-3xl p-6 max-w-xs mx-auto text-center">
      <div class="text-xs text-slate-400 mb-2">來電中…</div>
      <div class="text-5xl my-3">📱</div>
      <div class="font-medium mb-1">陌生號碼</div>
      <div v-if="step.dialogue" class="text-sm text-slate-200 italic min-h-[2em]">
        「{{ step.dialogue }}」
      </div>
      <div class="flex justify-center gap-6 mt-5 text-2xl">
        <span title="靜音">🔇</span>
        <span class="text-green-400" title="接聽">📞</span>
        <span class="text-red-400" title="掛斷">📵</span>
      </div>
    </div>

    <!-- 簡訊泡泡 -->
    <div v-else-if="variant === 'message'" class="bg-slate-100 rounded-2xl p-4">
      <div class="text-xs text-slate-400 mb-1">簡訊</div>
      <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm shadow-sm whitespace-pre-line">
        {{ step.dialogue }}
      </div>
    </div>

    <!-- LINE / 聊天 -->
    <div v-else-if="variant === 'chat'" class="bg-[#7aa] p-4 rounded-2xl">
      <div class="bg-white rounded-2xl rounded-tl-none p-3 text-sm shadow-sm max-w-[85%]">
        <div class="text-xs text-slate-400 mb-1">陌生人</div>
        {{ step.dialogue }}
      </div>
    </div>

    <!-- Email -->
    <div v-else-if="variant === 'email'" class="card p-4">
      <div class="border-b border-slate-100 pb-2 mb-2">
        <div class="text-xs text-slate-400">寄件者：service@notice-secure.xyz</div>
        <div class="text-sm font-medium">系统通知</div>
      </div>
      <div class="text-sm whitespace-pre-line">{{ step.dialogue }}</div>
    </div>

    <!-- 社群貼文 -->
    <div v-else-if="variant === 'social_post'" class="card p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">👤</div>
        <div>
          <div class="text-sm font-medium">官方小編</div>
          <div class="text-xs text-slate-400">剛剛</div>
        </div>
      </div>
      <div class="text-sm whitespace-pre-line">{{ step.dialogue }}</div>
    </div>

    <!-- fallback -->
    <div v-else class="card p-4 text-sm whitespace-pre-line">{{ step.dialogue }}</div>
  </div>
</template>
