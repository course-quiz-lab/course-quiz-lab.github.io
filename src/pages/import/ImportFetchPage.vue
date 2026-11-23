<script setup lang="ts">
import { useRouter } from 'vue-router';
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
  <div class="mx-auto w-full max-w-xl">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span
            class="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white"
          >
            2
          </span>
          <h2 class="text-sm font-semibold text-highlighted">链接导入</h2>
        </div>
      </template>

      <div class="space-y-4">
        <div class="flex items-start gap-3 rounded-lg bg-elevated p-4">
          <UIcon
            name="i-lucide-link"
            class="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div class="text-sm">
            <p class="font-medium text-highlighted">粘贴题库链接</p>
            <p class="mt-0.5 text-xs text-muted">
              链接需可直接访问 JSON 文件，并允许跨域（CORS）访问。
            </p>
          </div>
        </div>

        <UFormField label="题库链接">
          <UInput
            v-model="importStore.importUrl"
            type="url"
            size="lg"
            icon="i-lucide-globe"
            placeholder="https://example.com/questions.json"
            class="w-full"
            @keydown.enter="importFromUrl"
          />
        </UFormField>

        <UButton
          block
          size="lg"
          icon="i-lucide-download"
          :loading="importStore.isLoading"
          :disabled="!importStore.importUrl.trim() || importStore.isLoading"
          :label="importStore.isLoading ? '解析中…' : '解析链接'"
          @click="importFromUrl"
        />
      </div>

      <UAlert
        v-if="importStore.errors.length"
        color="error"
        variant="soft"
        class="mt-4"
        title="校验失败"
      >
        <template #description>
          <ul class="grid gap-1 text-xs">
            <li v-for="(item, index) in importStore.errors" :key="index">
              {{ item }}
            </li>
          </ul>
        </template>
      </UAlert>
    </UCard>
  </div>
</template>
