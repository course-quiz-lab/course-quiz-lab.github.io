import { nextTick, readonly, ref } from 'vue';

/**
 * 沉浸模式：进入后请求浏览器全屏，并隐藏站点顶部导航与页脚。
 * 布局状态是模块级的，`AppShell`（隐藏导航/页脚）与 `QuizPage`（切换按钮）
 * 共享同一份状态，切换视图或题目时不会丢失。
 *
 * 全屏采用尽力而为策略：浏览器拒绝或设备不支持（如 iOS Safari）时，
 * 仍然保留“隐藏导航与页脚”的沉浸布局，退出入口始终可用。
 */

export interface ExitImmersiveOptions {
  /** 退出时是否恢复进入前的滚动位置，默认 true */
  restoreScroll?: boolean;
}

const isImmersive = ref(false);

let savedScrollY = 0;
let hasSavedScroll = false;
let listenersBound = false;

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function fullscreenActive() {
  return canUseDom() && !!document.fullscreenElement;
}

async function requestFullscreen() {
  if (!canUseDom() || fullscreenActive()) return;
  const element = document.documentElement;
  if (typeof element.requestFullscreen !== 'function') return;
  try {
    await element.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* 全屏被拒绝（权限 / iframe 策略 / 不支持）时忽略，保留沉浸布局 */
  }
}

async function leaveFullscreen() {
  if (!fullscreenActive()) return;
  try {
    await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

function bindListeners() {
  if (listenersBound || !canUseDom()) return;
  listenersBound = true;

  // 用户按 Esc 或浏览器自身控件退出全屏时，同步退出沉浸布局
  document.addEventListener('fullscreenchange', () => {
    if (!isImmersive.value || document.fullscreenElement) return;
    void exitImmersive();
  });

  // 未成功进入全屏（如 iOS Safari）时的兜底退出方式
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isImmersive.value) return;
    if (document.fullscreenElement) return;
    void exitImmersive();
  });
}

async function restoreScrollPosition(top: number) {
  await nextTick();
  window.requestAnimationFrame(() => {
    // 布局已恢复（导航/页脚重新渲染）后再还原滚动，避免被高度变化裁剪
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  });
}

export async function enterImmersive() {
  if (!canUseDom() || isImmersive.value) return;
  bindListeners();

  savedScrollY = window.scrollY;
  hasSavedScroll = true;
  isImmersive.value = true;

  await requestFullscreen();

  // 全屏请求期间用户可能已退出沉浸模式，需要回收全屏状态
  if (!isImmersive.value && fullscreenActive()) {
    await leaveFullscreen();
  }
}

export async function exitImmersive({
  restoreScroll = true,
}: ExitImmersiveOptions = {}) {
  if (!isImmersive.value) return;

  isImmersive.value = false;
  await leaveFullscreen();

  const top = savedScrollY;
  const shouldRestore = restoreScroll && hasSavedScroll;
  savedScrollY = 0;
  hasSavedScroll = false;

  if (shouldRestore) {
    await restoreScrollPosition(top);
  }
}

export function toggleImmersive() {
  return isImmersive.value ? exitImmersive() : enterImmersive();
}

/** 离开答题页时调用：关闭沉浸布局与全屏，但不还原滚动位置（交给路由）。 */
export async function resetImmersive() {
  savedScrollY = 0;
  hasSavedScroll = false;
  if (isImmersive.value) {
    await exitImmersive({ restoreScroll: false });
    return;
  }
  await leaveFullscreen();
}

export function useImmersiveMode() {
  return {
    isImmersive: readonly(isImmersive),
    enterImmersive,
    exitImmersive,
    toggleImmersive,
    resetImmersive,
  };
}
