<script setup lang="ts">
// PWA lifecycle UI, driven by the plugin's virtual module.
// - offlineReady: first visit cached → app now works with no network.
// - needRefresh: a new deploy is waiting → user chooses when to activate it
//   (registerType: 'prompt'), so a mid-session reload is never forced.
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

function close() {
  offlineReady.value = false;
  needRefresh.value = false;
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4"
    role="alert"
    aria-live="polite"
  >
    <div
      class="card flex items-center gap-3 max-w-md w-full shadow-lg shadow-black/10"
    >
      <p class="text-sm text-slate-700 dark:text-slate-200 flex-1">
        <template v-if="needRefresh">
          Une nouvelle version est disponible.
        </template>
        <template v-else> AscendBox est prête à fonctionner hors ligne. </template>
      </p>

      <button
        v-if="needRefresh"
        type="button"
        class="min-h-11 px-4 rounded-full font-bold text-sm bg-force/10 dark:bg-force/20 text-force ring-1 ring-force/30 active:scale-95 transition"
        @click="updateServiceWorker(true)"
      >
        Recharger
      </button>
      <button
        type="button"
        class="min-h-11 px-3 rounded-full font-semibold text-sm text-slate-500 dark:text-slate-400 active:scale-95 transition"
        @click="close"
      >
        Fermer
      </button>
    </div>
  </div>
</template>
