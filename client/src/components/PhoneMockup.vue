<script setup lang="ts">
/**
 * 通用 iPhone 風格手機外框（動態島 + 狀態列 + Home 指示條）。
 * 用 default slot 放 APP 內容；statusBg 控制狀態列字色（深色/淺色 APP）。
 */
withDefaults(
  defineProps<{
    /** 狀態列字色：light=白字（深色 APP，如來電）；dark=黑字（淺色 APP，如簡訊）。 */
    statusBg?: 'light' | 'dark';
    /** 顯示的狀態列時間；不傳則顯示 9:41。 */
    time?: string;
  }>(),
  { statusBg: 'dark', time: '9:41' }
);
</script>

<template>
  <div class="mx-auto w-full max-w-[320px]">
    <div
      class="relative aspect-[9/19] w-full overflow-hidden rounded-[2.6rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl"
    >
      <!-- 螢幕區（內容可滾動） -->
      <div class="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-white">
        <!-- 動態島 -->
        <div
          class="pointer-events-none absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black"
        />

        <!-- 狀態列 -->
        <div
          class="flex shrink-0 items-center justify-between px-6 pt-2.5 text-[11px] font-semibold"
          :class="statusBg === 'light' ? 'text-white' : 'text-slate-900'"
        >
          <span>{{ time }}</span>
          <span class="flex items-center gap-1">
            <span aria-hidden="true">📶</span>
            <span aria-hidden="true">📡</span>
            <span class="ml-0.5 inline-block h-2.5 w-5 rounded-[3px] border border-current px-px py-px align-middle">
              <span class="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>

        <!-- APP 內容（slot）：overflow-hidden 避免抖動/旋轉動畫跑出捲軸；各 APP 畫面內部自行管理可捲動區 -->
        <div class="relative flex-1 overflow-hidden">
          <slot />
        </div>

        <!-- Home 指示條 -->
        <div class="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full"
          :class="statusBg === 'light' ? 'bg-white/80' : 'bg-slate-900/80'"
        />
      </div>
    </div>
  </div>
</template>
