<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type { Step, AppName } from '../lib/api';
import PhoneMockup from './PhoneMockup.vue';

const props = defineProps<{ step: Step }>();
const emit = defineEmits<{ ready: [] }>();

// 多階段流程：0=沉浸中（如響鈴/通知），1=已點開（通話中/APP 內）
const stage = ref(0);

/** 把對話內容依換行拆成多段，用於聊天逐句出現。 */
const dialogueLines = computed(() =>
  (props.step.dialogue || '').split('\n').map((l) => l.trim()).filter(Boolean)
);

/** 已出現的訊息段數（chat 用，逐步顯示）。 */
const shownLines = ref(0);

/** 智慧預設：appName 未指定時依 uiType 推斷。 */
const appName = computed<AppName>(() => {
  if (props.step.appName) return props.step.appName;
  switch (props.step.uiType) {
    case 'phone_call': return 'phone';
    case 'message': return 'sms';
    case 'chat': return 'line';
    case 'email': return 'email';
    case 'social_post': return 'fb';
  }
});

/** 依 APP 決定 emoji 預設大頭貼 / 圖示。 */
const APP_META: Record<AppName, { icon: string; avatar: string; bg: string; header: string }> = {
  phone:    { icon: '📞', avatar: '👤', bg: 'bg-slate-900',   header: '來電' },
  sms:      { icon: '💬', avatar: '💬', bg: 'bg-white',       header: '簡訊' },
  line:     { icon: 'LINE', avatar: '🟢', bg: 'bg-[#b3c6d0]', header: 'LINE' },
  ig:       { icon: 'IG', avatar: '📸', bg: 'bg-white',       header: 'Instagram' },
  fb:       { icon: 'f', avatar: '👤', bg: 'bg-white',        header: 'Facebook' },
  telegram: { icon: '✈️', avatar: '✈️', bg: 'bg-[#a3c6ec]',  header: 'Telegram' },
  twitter:  { icon: '𝕏', avatar: '🐦', bg: 'bg-black',       header: 'X（Twitter）' },
  email:    { icon: '✉️', avatar: '✉️', bg: 'bg-white',       header: '郵件' },
};
const meta = computed(() => APP_META[appName.value]);
const avatar = computed(() => props.step.avatar || meta.value.avatar);

const senderName = computed(() => props.step.sender || '未知');
const phoneNo = computed(() => props.step.phone || '');
const tsLabel = computed(() => props.step.timestamp || '剛剛');

/** 通知預覽（鎖定螢幕上截斷顯示）。 */
const previewText = computed(() => {
  const t = props.step.dialogue || '';
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
});

// ===== 階段控制 =====

/** 進入「已點開」階段（接聽來電 / 點開通知）。僅 phone_call、message 使用。 */
function enterStage1() {
  if (stage.value >= 1) return;
  stage.value = 1;
  // 後續 ready 由 stage watcher 在切換到通話中後觸發（phone_call）
}

/** chat 逐句顯示 + 打字動畫。 */
let chatTimer: ReturnType<typeof setInterval> | null = null;
function startChatReveal() {
  shownLines.value = 0;
  if (chatTimer) clearInterval(chatTimer);
  // 每段延遲一點出現
  chatTimer = setInterval(() => {
    shownLines.value++;
    if (shownLines.value >= dialogueLines.value.length) {
      if (chatTimer) clearInterval(chatTimer);
      chatTimer = null;
      nextTick(() => emit('ready'));
    }
  }, 750);
}

/** 自動完成沉浸（給 phone_call/message 在無 dialogue 時使用） */
watch(
  () => props.step.stepIndex,
  () => {
    // 切換 step 時重置
    stage.value = 0;
    shownLines.value = 0;
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }

    const hasDialogue = !!(props.step.dialogue && props.step.dialogue.trim());

    if (props.step.uiType === 'chat') {
      // chat 為單階段：有對話就自動逐句顯示，無對話就直接 ready
      if (hasDialogue) {
        startChatReveal();
      } else {
        nextTick(() => emit('ready'));
      }
    } else if (props.step.uiType === 'social_post' || props.step.uiType === 'email') {
      nextTick(() => emit('ready'));
    } else if (!hasDialogue && (props.step.uiType === 'phone_call' || props.step.uiType === 'message')) {
      // phone_call/message 無對話內容：仍呈現介面但立即 ready（不擋作答）
      nextTick(() => emit('ready'));
    }
  },
  { immediate: true }
);

// 對話字幕逐字顯示（phone_call 通話中用）；message 點開後直接 ready
const callCaptionShown = ref(false);
watch(stage, (s) => {
  if (s !== 1) return;
  if (props.step.uiType === 'phone_call') {
    setTimeout(() => {
      callCaptionShown.value = true;
      nextTick(() => emit('ready'));
    }, 350);
  } else if (props.step.uiType === 'message') {
    nextTick(() => emit('ready'));
  }
});
</script>

<template>
  <div class="mb-4">
    <!-- 情境說明文字（題目引導） -->
    <p class="mb-3 text-center text-sm text-slate-500">{{ step.scenario }}</p>

    <!-- ========== A. 來電 ========== -->
    <PhoneMockup
      v-if="step.uiType === 'phone_call'"
      status-bg="light"
      :time="step.timestamp && /^\d/.test(step.timestamp) ? step.timestamp.slice(0,5) : '9:41'"
    >
      <Transition name="fade" mode="out-in">
        <!-- Stage 0：響鈴中 -->
        <div
          v-if="stage === 0"
          key="ringing"
          class="flex h-full flex-col items-center justify-between bg-gradient-to-b from-slate-800 to-slate-900 px-6 pb-10 pt-12 text-center text-white"
          style="animation: phone-shake 0.6s ease-in-out infinite"
        >
          <div class="text-xs uppercase tracking-widest text-slate-300">來電中…</div>

          <div class="flex flex-col items-center gap-3">
            <div
              class="flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-5xl"
              style="animation: ring-pulse 1.5s ease-out infinite"
            >
              {{ avatar }}
            </div>
            <div class="mt-2 text-lg font-semibold">{{ senderName }}</div>
            <div v-if="phoneNo" class="text-sm text-slate-300">{{ phoneNo }}</div>
          </div>

          <div class="flex w-full max-w-[220px] items-center justify-between">
            <button
              class="flex flex-col items-center gap-1 text-xs text-slate-300"
              aria-hidden="true"
              tabindex="-1"
            >
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/60 text-xl">🔇</span>
              靜音
            </button>
            <button
              class="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-lg transition active:scale-95"
              style="animation: ring-pulse 1.2s ease-out infinite"
              @click="enterStage1"
              title="接聽"
            >
              📞
            </button>
            <button
              class="flex flex-col items-center gap-1 text-xs text-slate-300"
              aria-hidden="true"
              tabindex="-1"
            >
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/60 text-xl">➕</span>
              加入
            </button>
          </div>

          <button
            class="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white shadow-lg transition active:scale-95"
            @click="enterStage1"
          >
            📵 滑動來接聽
          </button>
        </div>

        <!-- Stage 1：通話中 -->
        <div
          v-else
          key="incall"
          class="flex h-full flex-col bg-gradient-to-b from-slate-800 to-slate-900 px-5 pb-10 pt-12 text-white"
        >
          <div class="text-center">
            <div class="text-2xl">{{ avatar }}</div>
            <div class="mt-1 text-lg font-semibold">{{ senderName }}</div>
            <div v-if="phoneNo" class="text-xs text-slate-300">{{ phoneNo }}</div>
            <div class="mt-1 flex items-center justify-center gap-1 text-xs text-green-400">
              <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              通話中 · 00:0{{ Math.min(stage, 9) }}
            </div>
          </div>

          <!-- 通話字幕（dialogue） -->
          <div
            v-if="step.dialogue"
            class="mt-6 flex-1"
            :class="callCaptionShown ? 'opacity-100' : 'opacity-0'"
            style="transition: opacity 0.5s"
          >
            <div class="rounded-2xl rounded-tl-sm bg-white/10 p-4 text-[15px] leading-relaxed text-slate-50">
              {{ step.dialogue }}
            </div>
            <div class="mt-3 text-center text-xs text-slate-400">對方正在說話…</div>
          </div>

          <div class="mt-auto flex justify-center">
            <button
              class="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl text-white shadow-lg transition active:scale-95"
              title="結束通話（可作答）"
              @click="emit('ready')"
            >
              📵
            </button>
          </div>
        </div>
      </Transition>
    </PhoneMockup>

    <!-- ========== B. 簡訊 / APP 通知 ========== -->
    <PhoneMockup
      v-else-if="step.uiType === 'message'"
      :status-bg="stage === 0 ? 'light' : 'dark'"
      :time="step.timestamp && /^\d/.test(step.timestamp) ? step.timestamp.slice(0,5) : '9:41'"
    >
      <Transition name="fade" mode="out-in">
        <!-- Stage 0：鎖定螢幕 + 通知 -->
        <div
          v-if="stage === 0"
          key="lock"
          class="relative h-full bg-gradient-to-b from-indigo-700 via-purple-700 to-slate-900 px-4 pb-10 pt-10 text-white"
        >
          <div class="mb-6 text-center">
            <div class="text-5xl font-light">
              {{ step.timestamp && /^\d/.test(step.timestamp) ? step.timestamp.slice(0,5) : '現在' }}
            </div>
            <div class="text-xs text-white/70">{{ tsLabel }}</div>
          </div>

          <!-- 通知卡片（從上滑入） -->
          <div
            class="rounded-2xl bg-white/15 p-3 backdrop-blur-md"
            style="animation: slide-down 0.5s ease-out"
          >
            <div class="mb-1.5 flex items-center gap-2 text-xs text-white/80">
              <span class="flex h-5 w-5 items-center justify-center rounded bg-white/25 text-[10px]">
                {{ meta.icon }}
              </span>
              <span class="font-medium">{{ meta.header }}</span>
              <span class="ml-auto">{{ tsLabel }}</span>
            </div>
            <div class="text-sm font-semibold">{{ senderName }}</div>
            <div class="mt-0.5 text-xs leading-snug text-white/85">{{ previewText }}</div>
          </div>

          <button
            class="mx-auto mt-6 flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-800 shadow-lg transition active:scale-95"
            @click="enterStage1"
          >
            點開查看 →
          </button>
        </div>

        <!-- Stage 1：APP 內完整內容 -->
        <div
          v-else
          key="app"
          class="flex h-full flex-col bg-slate-50"
        >
          <!-- APP 標頭 -->
          <div class="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">
              {{ avatar }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-slate-900">{{ senderName }}</div>
              <div class="text-[10px] text-slate-400">{{ phoneNo || meta.header }} · {{ tsLabel }}</div>
            </div>
            <span class="text-lg text-slate-400">ⓘ</span>
          </div>

          <!-- 訊息泡泡 -->
          <div class="flex-1 px-3 py-4">
            <div
              class="max-w-[88%] rounded-2xl rounded-tl-sm bg-white p-3 text-[13px] leading-relaxed text-slate-800 shadow-sm"
              style="animation: message-pop 0.4s ease-out"
            >
              <div class="mb-1 text-[10px] text-slate-400">{{ tsLabel }}</div>
              <div class="whitespace-pre-line">{{ step.dialogue }}</div>
            </div>
          </div>

          <!-- 輸入框（裝飾） -->
          <div class="border-t border-slate-200 bg-white px-3 py-2">
            <div class="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
              <span>💬</span><span>回覆訊息…</span>
            </div>
          </div>
        </div>
      </Transition>
    </PhoneMockup>

    <!-- ========== C. LINE / 聊天（逐句出現） ========== -->
    <PhoneMockup
      v-else-if="step.uiType === 'chat'"
      status-bg="dark"
      :time="step.timestamp && /^\d/.test(step.timestamp) ? step.timestamp.slice(0,5) : '9:41'"
    >
      <div class="flex h-full flex-col bg-[#b3c6d0]">
        <!-- LINE 標頭 -->
        <div class="flex items-center gap-2 bg-[#7aa] px-3 py-2.5 text-white">
          <span class="text-lg">‹</span>
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">{{ avatar }}</span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{{ senderName }}</div>
            <div class="text-[10px] text-white/80">{{ tsLabel }}</div>
          </div>
          <span class="text-lg">≡</span>
        </div>

        <!-- 訊息區 -->
        <div class="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          <div
            v-for="(line, i) in dialogueLines"
            :key="i"
            v-show="i < shownLines"
            class="flex"
            style="animation: message-pop 0.35s ease-out"
          >
            <div class="mr-2 mt-auto h-6 w-6 shrink-0 rounded-full bg-white/40 text-center text-xs leading-6">
              {{ avatar }}
            </div>
            <div class="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-800 shadow-sm">
              {{ line }}
            </div>
          </div>
          <!-- 打字中 -->
          <div v-if="shownLines < dialogueLines.length" class="flex items-center gap-2 pl-8 text-slate-700">
            <span class="flex gap-0.5 rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
              <span class="h-1.5 w-1.5 rounded-full bg-slate-400" style="animation: typing-dots 1.2s infinite" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-400" style="animation: typing-dots 1.2s infinite 0.2s" />
              <span class="h-1.5 w-1.5 rounded-full bg-slate-400" style="animation: typing-dots 1.2s infinite 0.4s" />
            </span>
          </div>
          <div v-else class="pt-1 text-center text-[10px] text-slate-700/70">{{ tsLabel }}</div>
        </div>

        <!-- 輸入框 -->
        <div class="border-t border-[#7aa]/40 bg-white px-3 py-2">
          <div class="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-400">
            <span>😊</span><span class="flex-1">輸入訊息…</span><span>➤</span>
          </div>
        </div>
      </div>
    </PhoneMockup>

    <!-- ========== D. Email ========== -->
    <PhoneMockup
      v-else-if="step.uiType === 'email'"
      status-bg="dark"
      time="9:41"
    >
      <div class="flex h-full flex-col bg-white">
        <div class="border-b border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500">
            ‹ 收件匣
          </div>
        <div class="flex-1 px-4 py-4" style="animation: fade-in-up 0.4s ease-out">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">{{ avatar }}</span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold">{{ senderName }}</div>
              <div class="text-[10px] text-slate-400">寄給 我 · {{ tsLabel }}</div>
            </div>
          </div>
          <div class="mt-3 text-base font-medium text-slate-900">{{ step.subject || '系統通知' }}</div>
          <div class="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">{{ step.dialogue }}</div>
        </div>
      </div>
    </PhoneMockup>

    <!-- ========== E. 社群貼文 ========== -->
    <PhoneMockup
      v-else-if="step.uiType === 'social_post'"
      status-bg="dark"
      time="9:41"
    >
      <div class="flex h-full flex-col bg-white">
        <!-- App 標頭 -->
        <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <span class="text-sm font-bold">{{ meta.header }}</span>
          <span class="text-lg text-slate-400">✉️</span>
        </div>
        <!-- 貼文 -->
        <div class="flex-1 overflow-y-auto" style="animation: fade-in-up 0.4s ease-out">
          <div class="flex items-center gap-2 px-3 py-2.5">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-amber-400 text-base text-white">
              {{ avatar }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold">{{ senderName }}</div>
              <div class="text-[10px] text-slate-400">{{ tsLabel }}</div>
            </div>
            <span class="text-lg text-slate-400">⋯</span>
          </div>
          <div class="whitespace-pre-line px-3 pb-3 text-[13px] leading-relaxed text-slate-800">
            {{ step.dialogue }}
          </div>
          <div v-if="step.postImage" class="flex h-32 items-center justify-center bg-slate-100 text-6xl">
            {{ step.postImage }}
          </div>
          <div class="flex items-center gap-4 px-3 py-2 text-lg text-slate-500">
            <span>❤️</span><span>💬</span><span>↗️</span>
            <span class="ml-auto text-xs text-slate-400">查看全部留言</span>
          </div>
        </div>
      </div>
    </PhoneMockup>

    <!-- fallback -->
    <div v-else class="card p-4 text-sm whitespace-pre-line">{{ step.dialogue }}</div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
