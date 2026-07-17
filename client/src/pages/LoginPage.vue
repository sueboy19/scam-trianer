<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { signInWith, signOut, type SocialProvider } from '../lib/auth';

const router = useRouter();
const user = useUserStore();

const providers: Array<{ id: SocialProvider; label: string; icon: string; color: string }> = [
  { id: 'google', label: 'Google 登入', icon: '🔵', color: 'hover:bg-slate-50' },
  { id: 'line', label: 'LINE 登入', icon: '🟢', color: 'hover:bg-green-50' },
  { id: 'facebook', label: 'Facebook 登入', icon: '🔵', color: 'hover:bg-blue-50' },
  { id: 'instagram', label: 'Instagram 登入', icon: '🟣', color: 'hover:bg-fuchsia-50' },
];

async function handleSignIn(p: SocialProvider) {
  try {
    await signInWith(p);
    // signInWith 會觸發 redirect，下面程式碼不一定執行
  } catch (e) {
    alert('登入失敗：' + (e as Error).message);
  }
}

async function handleSignOut() {
  await signOut();
  user.clear();
  router.push('/');
}
</script>

<template>
  <div class="max-w-md mx-auto py-10">
    <div class="card p-8 text-center">
      <div class="text-5xl mb-3">🛡️</div>
      <h1 class="text-2xl font-bold mb-1">歡迎來到防詐達人</h1>
      <p class="text-slate-500 text-sm mb-8">登入後即可記錄你的練習成績，並查看自己的弱點</p>

      <template v-if="user.isLoggedIn">
        <p class="mb-4">已登入：{{ user.info?.name }}</p>
        <button class="btn-ghost w-full" @click="handleSignOut">登出</button>
      </template>
      <template v-else>
        <div class="space-y-3">
          <button
            v-for="p in providers"
            :key="p.id"
            class="btn-ghost w-full !py-3 justify-start"
            :class="p.color"
            @click="handleSignIn(p.id)"
          >
            <span class="text-xl">{{ p.icon }}</span>
            <span>{{ p.label }}</span>
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-6">
          提示：未登入也能體驗測驗，但成績不會被記錄。
        </p>
      </template>
    </div>
  </div>
</template>
