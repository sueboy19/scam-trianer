<script setup lang="ts">
import type { Choice } from '../lib/api';

const props = defineProps<{ selectedChoice: Choice; correct: boolean }>();
</script>

<template>
  <div
    class="rounded-xl p-4 text-sm leading-relaxed animate-[fadeIn_.2s_ease]"
    :class="correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'"
  >
    <div class="font-bold mb-1">
      {{ correct ? '✓ 答對了！' : '✗ 這題答錯了' }}
    </div>
    <p>{{ selectedChoice.explanation }}</p>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
