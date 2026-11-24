<script setup lang="ts">
/**
 * 保留自定义实现：Nuxt UI 的 URadioGroup/UCheckboxGroup 自带 roving focus 与
 * 标准指示器布局，会与页面级 1-9 快捷键、字母徽标 + 整卡选中态冲突。
 * 这里继续使用隐藏的原生 radio/checkbox，保证原有交互完全一致。
 */
import { computed } from 'vue';
import type { QuestionItem } from '../types/bank';
import type { OptionItem } from '../types/core';
import { isMultiSelectType } from '../types/core';

const props = defineProps<{
  question: QuestionItem;
  modelValue: string[];
  disabled?: boolean;
  /** 是否已判分（练习提交后 / 考试交卷后）：需要标出未选中的正确答案 */
  revealAnswer?: boolean;
  /** 错题本等列表场景：收紧选项间距与内边距 */
  dense?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>();

const isMultiple = computed(() => isMultiSelectType(props.question.type));

function isSelected(id: string) {
  return props.modelValue.includes(id);
}

function isCorrectOption(id: string) {
  return props.question.answer.includes(id);
}

/** 未选中、但属于正确答案的选项：虚线框提示漏选 */
function isMissedCorrect(id: string) {
  return !!props.revealAnswer && !isSelected(id) && isCorrectOption(id);
}

function labelClass(id: string) {
  const selected = isSelected(id);
  const missed = isMissedCorrect(id);

  const classes: string[] = [];
  if (missed) {
    classes.push('border-dashed border-primary bg-primary/10 text-highlighted');
  } else if (selected) {
    classes.push('border-primary bg-primary/10 text-highlighted');
  } else {
    classes.push('border-default bg-default');
  }

  classes.push(
    props.disabled
      ? 'cursor-default'
      : 'cursor-pointer hover:border-primary/40 hover:bg-elevated',
  );

  // 多选题选中的错误选项降低不透明度，与正确选中的选项区分
  if (props.revealAnswer && selected && !isCorrectOption(id)) {
    classes.push('opacity-30');
  }

  return classes;
}

function badgeClass(id: string) {
  if (isSelected(id) || isMissedCorrect(id)) {
    return 'border-primary bg-primary text-inverted';
  }
  return 'border-default bg-elevated text-default';
}

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
  <div :class="dense ? 'grid gap-1.5' : 'grid gap-2.5'">
    <label
      v-for="option in question.options"
      :key="option.id"
      class="flex items-center rounded-lg border text-sm transition-colors duration-150"
      :class="[
        labelClass(option.id),
        dense ? 'gap-2.5 p-2.5 sm:text-base' : 'gap-3 p-3.5 sm:text-base',
      ]"
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
      <!-- 多选/不定项用圆角方形标签，与单选/判断的圆形区分题型 -->
      <span
        class="grid size-7 shrink-0 select-none place-items-center border text-xs font-semibold transition-colors duration-150"
        :class="[
          isMultiple ? 'rounded-md' : 'rounded-full',
          badgeClass(option.id),
        ]"
      >
        {{ option.id }}
      </span>
      <span class="min-w-0">{{ option.text }}</span>
    </label>
  </div>
</template>
