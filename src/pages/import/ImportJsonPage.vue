<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useImportStore } from '../../stores/import';
import { validateBankSchema } from '../../utils/validation';

const router = useRouter();
const importStore = useImportStore();
const toast = useToast();

/** 上传本地文件 / 从链接读取，两种方式共用一个入口页 */
const mode = ref<'upload' | 'link'>(
  importStore.selectedMethod === 'link' ? 'link' : 'upload',
);

watch(mode, (value) => {
  importStore.selectedMethod = value;
  // 切换方式时清掉上一次的错误，避免误导
  importStore.errors = [];
  importStore.warning = null;
});

const storeErrors = computed(() => importStore.errors);

const schemaUrl =
  'https://course-quiz-lab.github.io/json-schema/v1/bank.schema.json';

/** 可直接粘贴给 AI 的提示词：约束与 schema 保持一致 */
const aiPrompt = `你是一名题库整理助手。请把我在最后提供的课程内容整理成题库 JSON。

【输出格式】
1. 严格遵循这个 JSON Schema：${schemaUrl}
2. 只输出一个 JSON 代码块，不要输出多余的解释或注释；仅当触及下面“质量要求”中需要说明的情况时，可在代码块后附一句话。

【根对象】
只能包含三个键：$schema、metadata、questions。
- $schema：固定为上面那个 Schema 地址。
- metadata：必须包含 name（题库名称）、course（课程名称）、author（作者/整理者）；可选 source（来源说明）、sourceUrl（来源链接）。
- questions：题目数组，至少 1 题。

【题目字段】
- type：只能是 single（单选）、multiple（多选）、judge（判断）、indeterminate（不定项）。
- stem：题干，必填且不能为空。
- options：选项文本数组，至少 2 项；只有选择题需要，判断题不要写这个字段。
- answer：
  · single 用正确选项的下标（从 0 开始的整数）；
  · multiple / indeterminate 用下标数组，至少 1 项且不重复；
  · judge 用 true（正确）或 false（错误）。
- analysis：可选，题目解析。
- difficulty：可选，难度（建议 easy / medium / hard）。
- 除上述字段外不要再添加任何键（例如 meta、title、version 等），否则会被判定为非法。

【质量要求】
- answer 的下标必须落在 options 的范围内，且与选项内容对应。
- 题干和选项忠于原文，不要编造原文没有的知识点，也不要重复出题。`;

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(aiPrompt);
    toast.add({
      title: '提示词已复制',
      description: '粘贴到 AI 对话框，附上你的资料即可',
      icon: 'i-lucide-copy-check',
      color: 'success',
      duration: 2000,
    });
  } catch {
    toast.add({
      title: '复制失败',
      description: '请手动选中下面的文本复制',
      icon: 'i-lucide-circle-alert',
      color: 'error',
      duration: 2500,
    });
  }
}

/** 解析并校验 JSON 文本：读取方式（文件 / 链接）不同，后续流程完全一致 */
async function consumeJson(
  load: () => Promise<string>,
  failureMessage: string,
) {
  importStore.isLoading = true;
  importStore.errors = [];
  importStore.warning = null;
  importStore.preview = null;

  try {
    const text = await load();
    const parsed = JSON.parse(text);
    const result = validateBankSchema(parsed);
    importStore.errors = result.errors;
    importStore.warning = result.warning ?? null;
    importStore.preview = result.bank ?? null;
    if (!importStore.errors.length) {
      await router.push('/import/preview');
    }
  } catch {
    importStore.errors = [failureMessage];
  } finally {
    importStore.isLoading = false;
  }
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importStore.fileName = file.name;
  await consumeJson(
    () => file.text(),
    '文件解析失败，请确认是有效的 JSON 格式。',
  );
}

async function importFromUrl() {
  const url = importStore.importUrl.trim();
  if (!url) return;

  await consumeJson(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('FETCH_FAILED');
    return await response.text();
  }, '链接解析失败，请确认链接可访问且为有效 JSON。');
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
          <h2 class="text-sm font-semibold text-highlighted">导入 JSON 题库</h2>
        </div>
      </template>

      <UFieldGroup class="w-full">
        <UButton
          block
          :variant="mode === 'upload' ? 'solid' : 'outline'"
          :color="mode === 'upload' ? 'primary' : 'neutral'"
          icon="i-lucide-file-json"
          label="上传文件"
          @click="mode = 'upload'"
        />
        <UButton
          block
          :variant="mode === 'link' ? 'solid' : 'outline'"
          :color="mode === 'link' ? 'primary' : 'neutral'"
          icon="i-lucide-link"
          label="从链接读取"
          @click="mode = 'link'"
        />
      </UFieldGroup>

      <!-- 方式一：上传本地 JSON 文件 -->
      <div
        v-if="mode === 'upload'"
        class="mt-4 rounded-xl border border-dashed border-default bg-elevated px-4 py-8 text-center"
      >
        <UIcon name="i-lucide-file-json" class="mx-auto size-8 text-muted" />
        <p class="mt-3 text-sm font-medium text-highlighted">选择 JSON 文件</p>
        <p class="mt-1 text-xs text-muted">支持符合 schema 的题库 JSON</p>

        <!-- 保留原生 file input：UFileUpload 会改变为拖拽/受控模型交互 -->
        <input
          type="file"
          accept="application/json"
          class="mt-4 w-full max-w-full cursor-pointer text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
          @change="handleFileChange"
        />

        <p v-if="importStore.isLoading" class="mt-2 text-xs text-muted">
          解析中…
        </p>
        <p v-else-if="importStore.fileName" class="mt-2 text-xs text-muted">
          {{ importStore.fileName }}
        </p>
      </div>

      <!-- 方式二：从在线链接读取 -->
      <div v-else class="mt-4 space-y-3">
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

        <UInput
          v-model="importStore.importUrl"
          type="url"
          size="lg"
          icon="i-lucide-globe"
          placeholder="https://example.com/questions.json"
          aria-label="题库链接"
          class="w-full"
          @keydown.enter="importFromUrl"
        />

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

      <ULink
        :to="schemaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <UIcon name="i-lucide-external-link" class="size-3.5" />
        查看题库 JSON Schema
      </ULink>

      <UCollapsible class="mt-2">
        <UButton
          class="group"
          label="AI 辅助生成教程"
          color="neutral"
          variant="subtle"
          trailing-icon="i-lucide-chevron-down"
          :ui="{
            trailingIcon:
              'group-data-[state=open]:rotate-180 transition-transform duration-200',
          }"
          block
        />
        <template #content>
          <div class="mt-2 space-y-3 rounded-lg border border-default p-3">
            <ol
              class="m-0 grid list-decimal gap-1.5 pl-4 text-xs leading-relaxed text-muted"
            >
              <li>复制下面的提示词，粘贴到任意能处理长文本的 AI 对话框。</li>
              <li>
                在提示词末尾的引号里粘贴你的讲义、笔记或题目原文，然后发送。
              </li>
              <li>
                把 AI 返回的 JSON 保存为
                <span class="font-mono">.json</span>
                文件，回到本页上传即可。
              </li>
            </ol>

            <div class="flex flex-wrap items-end justify-between gap-2 mt-4">
              <UButton
                size="xs"
                variant="outline"
                color="neutral"
                icon="i-lucide-copy"
                label="复制提示词"
                @click="copyPrompt"
              />
            </div>

            <pre
              class="max-h-72 select-all overflow-auto whitespace-pre-wrap break-words rounded-lg border border-default bg-elevated p-3 font-mono text-xs leading-relaxed text-default"
              >{{ aiPrompt }}</pre>
          </div>
        </template>
      </UCollapsible>

      <UAlert
        v-if="storeErrors.length"
        color="error"
        variant="soft"
        class="mt-4"
        title="校验失败"
      >
        <template #description>
          <ul class="grid gap-1 text-xs">
            <li v-for="(item, index) in storeErrors" :key="index">
              {{ item }}
            </li>
          </ul>
        </template>
      </UAlert>
    </UCard>
  </div>
</template>
