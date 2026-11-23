import { computed, ref } from 'vue';

/**
 * 主题（主色 + 明暗）运行时控制。
 *
 * 主色：写入 Nuxt UI 的 `appConfig.ui.colors.primary`，由 @nuxt/ui 的 colors
 * 运行时插件重新生成 `--ui-primary` / `--ui-color-primary-*` 变量，全站即时生效。
 * 明暗：Nuxt UI 使用 `.dark` class（@vueuse/core 的 useDark 维护），这里直接操作
 * DOM 并写入同一个 localStorage 键，保证与插件状态一致。
 */

export type ColorMode = 'light' | 'dark' | 'system';

export interface ThemeColorOption {
  /** appConfig.ui.colors.primary 取值 */
  name: string;
  /** 中文名 */
  label: string;
  /** Tailwind 500 色号，用于色板圆点 */
  swatch: string;
}

export const themeColors: ThemeColorOption[] = [
  { name: 'red', label: '红色', swatch: '#ef4444' },
  { name: 'orange', label: '橙色', swatch: '#f97316' },
  { name: 'amber', label: '琥珀', swatch: '#f59e0b' },
  { name: 'yellow', label: '黄色', swatch: '#eab308' },
  { name: 'lime', label: '青柠', swatch: '#84cc16' },
  { name: 'green', label: '绿色', swatch: '#22c55e' },
  { name: 'emerald', label: '翠绿', swatch: '#10b981' },
  { name: 'teal', label: '青色', swatch: '#14b8a6' },
  { name: 'cyan', label: '天青', swatch: '#06b6d4' },
  { name: 'sky', label: '天蓝', swatch: '#0ea5e9' },
  { name: 'blue', label: '蓝色', swatch: '#3b82f6' },
  { name: 'indigo', label: '靛蓝', swatch: '#6366f1' },
  { name: 'violet', label: '紫罗兰', swatch: '#8b5cf6' },
  { name: 'purple', label: '紫色', swatch: '#a855f7' },
  { name: 'fuchsia', label: '洋红', swatch: '#d946ef' },
  { name: 'pink', label: '粉色', swatch: '#ec4899' },
  { name: 'rose', label: '玫红', swatch: '#f43f5e' },
];

const PRIMARY_STORAGE_KEY = 'quiz-primary-color';
const COLOR_MODE_STORAGE_KEY = 'vueuse-color-scheme';
const DEFAULT_PRIMARY = 'green';

const isValidColor = (name: string) =>
  themeColors.some((color) => color.name === name);

const primary = ref(DEFAULT_PRIMARY);
const colorMode = ref<ColorMode>('system');
const systemPrefersDark = ref(false);

const isDark = computed(() =>
  colorMode.value === 'system'
    ? systemPrefersDark.value
    : colorMode.value === 'dark',
);

function applyDarkClass(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

/** 启动阶段调用：恢复持久化的主色与明暗偏好（mount 前执行，避免闪烁）。 */
export function applyStoredTheme() {
  const appConfig = useAppConfig();

  try {
    const storedPrimary = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (storedPrimary && isValidColor(storedPrimary)) {
      primary.value = storedPrimary;
      appConfig.ui.colors.primary = storedPrimary;
    }

    const storedMode = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (storedMode === 'light' || storedMode === 'dark') {
      colorMode.value = storedMode;
    } else {
      colorMode.value = 'system';
    }
  } catch {
    colorMode.value = 'system';
  }

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  systemPrefersDark.value = media?.matches ?? false;
  applyDarkClass(isDark.value);

  // 跟随系统时，系统主题变化需要同步 class
  media?.addEventListener?.('change', (event) => {
    systemPrefersDark.value = event.matches;
    if (colorMode.value === 'system') {
      applyDarkClass(event.matches);
    }
  });
}

export function setPrimary(name: string) {
  if (!isValidColor(name)) return;
  primary.value = name;
  useAppConfig().ui.colors.primary = name;
  try {
    localStorage.setItem(PRIMARY_STORAGE_KEY, name);
  } catch {
    /* ignore */
  }
}

export function setColorMode(mode: ColorMode) {
  colorMode.value = mode;
  applyDarkClass(isDark.value);
  try {
    localStorage.setItem(
      COLOR_MODE_STORAGE_KEY,
      mode === 'system' ? 'auto' : mode,
    );
  } catch {
    /* ignore */
  }
}

export function toggleDark() {
  setColorMode(isDark.value ? 'light' : 'dark');
}

export function useTheme() {
  return {
    colors: themeColors,
    primary,
    colorMode,
    isDark,
    setPrimary,
    setColorMode,
    toggleDark,
  };
}
