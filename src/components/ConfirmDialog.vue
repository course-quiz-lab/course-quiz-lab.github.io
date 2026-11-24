<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';

const { state, accept, cancel } = useConfirm();

function handleOpenUpdate(value: boolean) {
  // Esc / 点击遮罩 / 关闭按钮都走这里，一律视为取消
  if (!value) cancel();
}
</script>

<template>
  <UModal
    :open="state?.open ?? false"
    :title="state?.title"
    :description="state?.description"
    :ui="{ footer: 'justify-end gap-2' }"
    @update:open="handleOpenUpdate"
  >
    <template #footer>
      <UButton
        color="neutral"
        variant="ghost"
        :label="state?.cancelText ?? '取消'"
        @click="cancel"
      />
      <UButton
        :color="state?.color ?? 'primary'"
        :label="state?.confirmText ?? '确认'"
        @click="accept"
      />
    </template>
  </UModal>
</template>
