<script setup lang="ts">
import { computed } from 'vue';
import { useTheme, type ColorMode } from '../composables/useTheme';

const { colors, primary, colorMode, setPrimary, setColorMode } = useTheme();

const modes: { value: ColorMode; label: string; icon: string }[] = [
  { value: 'light', label: '浅色', icon: 'i-lucide-sun' },
  { value: 'dark', label: '深色', icon: 'i-lucide-moon' },
  { value: 'system', label: '系统', icon: 'i-lucide-monitor' },
];

const currentLabel = computed(
  () => colors.find((color) => color.name === primary.value)?.label ?? '主题色',
);
</script>

<template>
  <UPopover :content="{ align: 'end', sideOffset: 8 }">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-palette"
      square
      aria-label="自定义主题色"
      title="自定义主题色"
    />

    <template #content>
      <div class="w-64 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-muted">主题色</span>
          <span class="text-xs text-dimmed">{{ currentLabel }}</span>
        </div>

        <div class="grid grid-cols-6 gap-2">
          <button
            v-for="color in colors"
            :key="color.name"
            type="button"
            class="relative flex size-7 cursor-pointer items-center justify-center rounded-full transition duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="
              color.name === primary
                ? 'ring-2 ring-primary ring-offset-2 ring-offset-default'
                : ''
            "
            :style="{ backgroundColor: color.swatch }"
            :aria-label="color.label"
            :title="color.label"
            @click="setPrimary(color.name)"
          >
            <UIcon
              v-if="color.name === primary"
              name="i-lucide-check"
              class="size-3.5 text-white drop-shadow"
            />
          </button>
        </div>

        <USeparator class="my-3" />

        <p class="mb-2 text-xs font-medium text-muted">外观</p>
        <div class="grid grid-cols-3 gap-1">
          <UButton
            v-for="mode in modes"
            :key="mode.value"
            :icon="mode.icon"
            :label="mode.label"
            size="xs"
            block
            :variant="colorMode === mode.value ? 'soft' : 'ghost'"
            :color="colorMode === mode.value ? 'primary' : 'neutral'"
            class="justify-center"
            @click="setColorMode(mode.value)"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
