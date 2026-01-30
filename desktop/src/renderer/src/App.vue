<template>
  <div class="app-container">
    <!-- 标题栏区域（可拖动） -->
    <div class="title-bar">
      <div class="drag-region">
        <span class="title">WPP Desktop</span>
      </div>
      <div class="window-controls">
        <button class="control-btn" @click="handleMinimize" title="最小化">
          <span class="icon">─</span>
        </button>
        <button class="control-btn" @click="handleMaximize" title="最大化/还原">
          <span class="icon">{{ isMaximized ? '❐' : '□' }}</span>
        </button>
        <button class="control-btn close-btn" @click="handleClose" title="关闭">
          <span class="icon">×</span>
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <h1>Hello Desktop</h1>
      <p>WPP Desktop is running!</p>
      <div class="versions">
        <p>Node: {{ versions.node }}</p>
        <p>Chrome: {{ versions.chrome }}</p>
        <p>Electron: {{ versions.electron }}</p>
      </div>
      <div class="api-status">
        <p v-if="apiReady" class="success">✓ window.electronAPI 已加载</p>
        <p v-else class="error">✗ window.electronAPI 不可用</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const versions = ref({
  node: '',
  chrome: '',
  electron: '',
});

const isMaximized = ref(false);
const apiReady = ref(false);

let unsubscribe: (() => void) | null = null;

function handleMinimize(): void {
  window.electronAPI?.window.minimize();
}

function handleMaximize(): void {
  window.electronAPI?.window.maximize();
}

function handleClose(): void {
  window.electronAPI?.window.close();
}

onMounted(async () => {
  if (window.electronAPI) {
    apiReady.value = true;
    versions.value = window.electronAPI.versions;
    
    // 获取初始最大化状态
    isMaximized.value = await window.electronAPI.window.isMaximized();
    
    // 监听最大化状态变化
    unsubscribe = window.electronAPI.window.onMaximizedChange((maximized: boolean) => {
      isMaximized.value = maximized;
    });
  }
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a2e;
  color: #eee;
}

/* 标题栏 */
.title-bar {
  display: flex;
  height: 40px;
  background: #16213e;
  user-select: none;
}

.drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 16px;
  -webkit-app-region: drag;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: #aaa;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 40px;
  border: none;
  background: transparent;
  color: #aaa;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.close-btn:hover {
  background: #e81123;
  color: #fff;
}

.icon {
  line-height: 1;
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  color: #42b883;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  color: #999;
  font-size: 1.1rem;
}

.versions {
  margin-top: 2rem;
  padding: 1rem 2rem;
  background: #0f3460;
  border-radius: 8px;
}

.versions p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #7ec8e3;
}

.api-status {
  margin-top: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
}

.api-status .success {
  color: #4ade80;
}

.api-status .error {
  color: #f87171;
}
</style>

