import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../lib/api';

export interface UserInfo {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
}

export const useUserStore = defineStore('user', () => {
  const info = ref<UserInfo | null>(null);
  const loading = ref(false);

  const isLoggedIn = computed(() => info.value !== null);

  async function fetchMe() {
    loading.value = true;
    try {
      const data = await api.get<{ user: UserInfo | null }>('/api/me');
      info.value = data.user;
    } catch {
      info.value = null;
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    info.value = null;
  }

  return { info, loading, isLoggedIn, fetchMe, clear };
});
