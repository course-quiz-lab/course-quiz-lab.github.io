<script setup lang="ts">
import { computed } from 'vue';
import { isMultiSelectType, type OptionItem, type QuestionItem } from '../types/quiz';

const props = defineProps<{
  question: QuestionItem;
  modelValue: string[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>();

const isMultiple = computed(() => isMultiSelectType(props.question.type));

function updateSelection(option: OptionItem, checked: boolean) {
  if (props.disabled) return;
  if (isMultiple.value) {
    const selected = new Set(props.modelValue);
    if (checked) {
      selected.add(option.id);
    } else {
      selected.delete(option.id);
    }
    emit('update:modelValue', Array.from(selected));
    return;
  }
  emit('update:modelValue', [option.id]);
}
</script>

<template>
  <div class="grid gap-[12px]">
    <label
      v-for="option in question.options"
      :key="option.id"
      class="grid grid-cols-[28px_1fr] gap-[12px] items-center p-[12px] p-4 rounded-xl border border-transparent bg-surface-option cursor-pointer transition-all duration-200"
      :class="{
        '!border-[rgba(47,111,107,0.5)] !bg-[rgba(47,111,107,0.08)]':
          modelValue.includes(option.id),
        'opacity-60 cursor-not-allowed': disabled,
      }"
    >
      <input
        :type="isMultiple ? 'checkbox' : 'radio'"
        :name="question.id"
        :checked="modelValue.includes(option.id)"
        :disabled="disabled"
        class="hidden"
        @change="
          updateSelection(option, ($event.target as HTMLInputElement).checked)
        "
      />
      <span
        class="select-none w-[26px] h-[26px] rounded-full bg-surface flex items-center justify-center font-semibold text-sm border border-[rgba(43,34,24,0.12)] text-muted"
        :class="{
          '!bg-brand !text-white !border-brand': modelValue.includes(option.id),
        }"
        >{{ option.id }}</span
      >
      <span>{{ option.text }}</span>
    </label>
  </div>
</template>
