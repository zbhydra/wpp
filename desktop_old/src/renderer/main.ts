// 标记渲染进程开始执行（最早的时间点）
window.__RENDERER_STARTED = true;
if (window.__PERF) {
  window.__PERF.log('renderer_execution_start');
}

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import './style.css';

// 从 preload 获取调试开关
const DEBUG_MODE = (window as any).electronAPI?.DEBUG_MODE ?? false;

// 模块导入追踪
if (window.__PERF) {
  window.__PERF.logSince('modules_imported', 'renderer_execution_start');
}

// 使用全局性能对象（如果存在）
if (window.__PERF) {
  window.__PERF.log('main_ts_start');
}

// 性能测试 - 详细追踪
const perfMarks = {
  startTime: performance.now(),
  marks: {} as Record<string, number>,
};

function mark(name: string) {
  const time = performance.now();
  perfMarks.marks[name] = time;
  const elapsed = (time - perfMarks.startTime).toFixed(2);
  if (DEBUG_MODE) console.log(`[Renderer] → ${name}: +${elapsed}ms`);
  if (window.__PERF) {
    window.__PERF.log(name);
  }
  return time;
}

function markSince(name: string, since: string) {
  const time = performance.now();
  const elapsed = (time - perfMarks.marks[since]).toFixed(2);
  if (DEBUG_MODE) console.log(`[Renderer] ✓ ${name} (since ${since}): ${elapsed}ms`);
  return time;
}

// 创建 app
const appStart = mark('createApp_start');
const app = createApp(App);
markSince('createApp_done', 'createApp_start');

// 注册路由
const routerStart = mark('use_router_start');
app.use(router);
markSince('use_router_done', 'use_router_start');

// 注册 i18n
const i18nStart = mark('use_i18n_start');
app.use(i18n);
markSince('use_i18n_done', 'use_i18n_start');

// 挂载
const mountStart = mark('mount_start');
app.mount('#app');
markSince('mount_done', 'mount_start');

// 总时间
const totalTime = (performance.now() - perfMarks.startTime).toFixed(2);
if (DEBUG_MODE) console.log(`[Renderer] ========== Total Vue setup: ${totalTime}ms ==========`);

if (window.__PERF) {
  window.__PERF.log('vue_setup_complete');
}

// 监听关键性能事件
window.addEventListener('DOMContentLoaded', () => {
  mark('DOMContentLoaded');
  if (window.__PERF) {
    window.__PERF.log('DOMContentLoaded_event');
  }
});

window.addEventListener('load', () => {
  mark('window_load');
  if (window.__PERF) {
    window.__PERF.log('window_load_event');
  }

  const timing = performance.timing;
  if (DEBUG_MODE) {
    console.log('[Renderer] Navigation Timing API:');
    console.log('  - navigationStart:', timing.navigationStart);
    console.log('  - domLoading:', timing.domLoading - timing.navigationStart, 'ms');
    console.log('  - domInteractive:', timing.domInteractive - timing.navigationStart, 'ms');
    console.log('  - domContentLoadedEventStart:', timing.domContentLoadedEventStart - timing.navigationStart, 'ms');
    console.log('  - domContentLoadedEventEnd:', timing.domContentLoadedEventEnd - timing.navigationStart, 'ms');
    console.log('  - domComplete:', timing.domComplete - timing.navigationStart, 'ms');
    console.log('  - loadEventStart:', timing.loadEventStart - timing.navigationStart, 'ms');
  }

  // 分析资源加载
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    if (DEBUG_MODE) {
      console.log('[Renderer] Resource Loading Summary:');
      console.log(`  Total resources: ${resources.length}`);
    }

    // 按类型分组统计
    const byType = {
      script: { count: 0, size: 0, duration: 0 },
      stylesheet: { count: 0, size: 0, duration: 0 },
      link: { count: 0, size: 0, duration: 0 },
    };

    resources.forEach(r => {
      const type = r.initiatorType;
      if (byType[type]) {
        byType[type].count++;
        byType[type].size += r.transferSize || 0;
        byType[type].duration += r.duration - r.redirectEnd - r.startTime;
      }
    });

    if (DEBUG_MODE) {
      console.log('[Renderer] Resources by type:');
      Object.entries(byType).forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.count} files, ${stats.duration.toFixed(2)}ms total`);
      });

      // 找出最慢的资源
      const sorted = [...resources].sort((a, b) => b.duration - a.duration);
      console.log('[Renderer] Top 10 slowest resources:');
      sorted.slice(0, 10).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name}: ${r.duration.toFixed(2)}ms`);
      });
    }
  }
});
