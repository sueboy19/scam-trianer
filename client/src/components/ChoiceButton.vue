<script setup lang="ts">
import type { Choice } from '../lib/api';

const props = defineProps<{
  choice: Choice;
  index: number;
  revealed: boolean; // 是否已作答（顯示對錯）
  selected: boolean; // 是否為使用者選的
}>();

const emit = defineEmits<{ choose: [index: number] }>();

const letters = ['A', 'B', 'C', 'D', 'E'];

function state() {
  if (!props.revealed) return 'idle';
  if (props.choice.correct) return 'correct';
  if (props.selected) return 'wrong';
  return 'dim';
}
</script>

<template>
  <button
    class="w-full text-left p-3 rounded-xl border-2 transition flex gap-3 items-start"
    :class="{
      'border-slate-200 hover:border-brand-400 hover:bg-brand-50/40 bg-white': state() === 'idle',
      'border-green-500 bg-green-50': state() === 'correct',
      'border-red-500 bg-red-50': state() === 'wrong',
      'border-slate-100 bg-slate-50 opacity-60': state() === 'dim',
    }"
    :disabled="revealed"
    @click="emit('choose', index)"
  >
    <span
      class="flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
      :class="{
        'bg-slate-100 text-slate-500': state() === 'idle',
        'bg-green-500 text-white': state() === 'correct',
        'bg-red-500 text-white': state() === 'wrong',
        'bg-slate-200 text-slate-400': state() === 'dim',
      }"
    >
      <template v-if="state() === 'correct'">✓</template>
      <template v-else-if="state() === 'wrong'">✗</template>
      <template v-else>{{ letters[index] }}</template>
    </span>
    <span class="text-sm leading-relaxed pt-0.5">{{ choice.text }}</span>
  </button>
</template>
