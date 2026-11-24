import { ref } from 'vue';

/**
 * 全局确认框：用 Nuxt UI 的 UModal 替代原生 `confirm()`，
 * 由 `App.vue` 里的单个 `<ConfirmDialog />` 承载，所有页面共用。
 */

export type ConfirmColor = 'primary' | 'error' | 'warning' | 'neutral';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 确认按钮颜色，删除类操作建议用 error */
  color?: ConfirmColor;
}

export interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

const state = ref<ConfirmState | null>(null);
let resolver: ((confirmed: boolean) => void) | null = null;

function settle(confirmed: boolean) {
  const resolve = resolver;
  resolver = null;
  if (state.value) state.value.open = false;
  resolve?.(confirmed);
}

/** 打开确认框，resolve 用户是否点了「确认」（取消 / Esc / 点遮罩都算 false） */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // 上一个还没关闭就再次调用：先把上一个按取消处理，避免 promise 悬挂
  resolver?.(false);
  resolver = null;
  state.value = { ...options, open: true };
  return new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
}

export function useConfirm() {
  return {
    state,
    accept: () => settle(true),
    cancel: () => settle(false),
  };
}
