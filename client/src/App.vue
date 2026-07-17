<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView, RouterLink } from 'vue-router';
import { useUserStore } from './stores/user';

const user = useUserStore();

onMounted(() => {
  // 啟動時拉一次登入狀態
  user.fetchMe();
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2 font-bold text-lg">
          <span class="text-2xl">🛡️</span>
          <span>防詐達人</span>
        </RouterLink>
        <nav class="flex items-center gap-1 text-sm">
          <RouterLink to="/" class="px-3 py-1.5 rounded-lg hover:bg-slate-100">情境練習</RouterLink>
          <RouterLink to="/stats" class="px-3 py-1.5 rounded-lg hover:bg-slate-100">常犯錯誤</RouterLink>
          <template v-if="user.isLoggedIn">
            <RouterLink to="/history" class="px-3 py-1.5 rounded-lg hover:bg-slate-100">我的紀錄</RouterLink>
            <img v-if="user.info?.image" :src="user.info.image" :alt="user.info.name"
              class="w-8 h-8 rounded-full ml-1" />
            <span v-else class="px-2 text-slate-600">{{ user.info?.name }}</span>
          </template>
          <RouterLink v-else to="/login" class="btn-primary !py-1.5 !px-3">登入</RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
      <RouterView />
    </main>

    <footer class="text-center text-xs text-slate-400 py-4">
      防詐達人 · 台灣詐騙防制訓練 · 遇詐騙請撥 165
    </footer>
  </div>
</template>
