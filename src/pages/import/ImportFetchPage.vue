<script setup lang="ts">
import { mdiLinkVariant } from '@mdi/js';
import { useRouter } from 'vue-router';
import ImportStepIndicator from '../../components/import/ImportStepIndicator.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppIcon from '../../components/ui/AppIcon.vue';
import { useImportStore } from '../../stores/import';
import { validateBankSchema } from '../../utils/validation';

const router = useRouter();
const importStore = useImportStore();

async function importFromUrl() {
  if (!importStore.importUrl.trim()) return;
  importStore.isLoading = true;
  importStore.errors = [];
  importStore.warning = null;
  importStore.preview = null;

  try {
    const response = await fetch(importStore.importUrl.trim());
    if (!response.ok) {
      throw new Error('FETCH_FAILED');
    }
    const text = await response.text();
    const parsed = JSON.parse(text);
    const result = validateBankSchema(parsed);
    importStore.errors = result.errors;
    importStore.warning = result.warning ?? null;
    importStore.preview = result.bank ?? null;
    if (!importStore.errors.length) {
      router.push('/import/preview');
    }
  } catch {
    importStore.errors = ['链接解析失败，请确认链接可访问且为有效 JSON。'];
  } finally {
    importStore.isLoading = false;
  }
}
</script>

<template>
  <div class="max-w-[600px] mx-auto px-4 flex flex-col gap-4 sm:gap-5">
    <ImportStepIndicator :current-step="2" />
    <AppCard class="!p-4 sm:!p-5 overflow-hidden">
      <div class="flex items-center gap-2 mb-3">
        <span
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold shrink-0"
          >2</span
        >
        <h2 class="text-base max-sm:text-sm">链接导入</h2>
      </div>

      <div
        class="p-4 rounded-xl border border-[color:var(--border)] bg-surface-soft"
      >
        <div class="flex flex-col items-center gap-2 text-center">
          <AppIcon :path="mdiLinkVariant" :size="28" class="text-muted" />
          <div>
            <p class="text-sm font-medium">粘贴题库链接</p>
            <p class="text-xs text-muted mt-0.5">
              链接需可直接访问 JSON 文件，支持 CORS
            </p>
          </div>
          <input
            v-model="importStore.importUrl"
            type="url"
            placeholder="https://example.com/questions.json"
            class="w-full max-w-full px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-surface text-xs"
          />
          <AppButton
            :disabled="!importStore.importUrl.trim() || importStore.isLoading"
            @click="importFromUrl"
            class="max-sm:text-[13px] max-sm:px-3 max-sm:py-2"
          >
            {{ importStore.isLoading ? '解析中…' : '解析链接' }}
          </AppButton>
        </div>
      </div>

      <!-- Errors -->
      <div
        v-if="importStore.errors.length"
        class="mt-3 p-3 rounded-xl border border-[rgba(185,74,60,0.4)] bg-[rgba(185,74,60,0.08)]"
      >
        <div class="font-semibold text-xs mb-1">校验失败</div>
        <ul class="text-xs text-muted grid gap-0.5">
          <li v-for="(item, index) in importStore.errors" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
    </AppCard>
  </div>
</template>
