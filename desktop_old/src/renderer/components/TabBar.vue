<template>
  <div class="tab-bar" ref="tabBarRef">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      :class="['tab-item', { active: tab.id === activeTabId }]"
      :data-id="tab.id"
      @click="handleTabClick(tab)"
    >
      <span class="tab-title">{{ tab.title }}</span>
      <span
        v-if="tab.closable"
        class="tab-close"
        @click.stop="handleTabClose(tab)"
      >
        ×
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Sortable from 'sortablejs';
import { electronApi } from '@/api';
import { useEnv } from '@/composables/useEnv';
import type { Tab } from '@/shared/storage-interface';

const env = useEnv();
const hasTabs = computed(() => env.isElectron);

const tabBarRef = ref<HTMLElement | null>(null);

const tabs = ref<Tab[]>([
  { id: 'admin', title: '管理', closable: false }
]);

const activeTabId = ref('admin');

// 防止重复关闭同一个标签
const closingTabs = new Set<string>();

let sortableInstance: Sortable | null = null;

const handleTabClick = (tab: Tab) => {
  if (tab.id === activeTabId.value) return;
  activeTabId.value = tab.id;
  // 通知主进程切换视图
  electronApi.tab.switchTab(tab.id);
};

const handleTabClose = (tab: Tab) => {
  if (!tab.closable) return;

  // 防止重复关闭
  if (closingTabs.has(tab.id)) {
    return;
  }
  closingTabs.add(tab.id);

  // 通知主进程关闭视图
  electronApi.tab.closeTab(tab.id).finally(() => {
    closingTabs.delete(tab.id);
  });
};

// 暴露方法供父组件调用
const addTab = (tab: Tab) => {
  if (tabs.value.some(t => t.id === tab.id)) {
    return; // 已存在
  }
  tabs.value.push(tab);
};

const removeTab = (tabId: string) => {
  const index = tabs.value.findIndex(t => t.id === tabId);
  if (index > -1) {
    tabs.value.splice(index, 1);
    // 如果关闭的是当前标签，切换到前一个或管理页
    if (activeTabId.value === tabId) {
      const newActiveIndex = Math.max(0, index - 1);
      activeTabId.value = tabs.value[newActiveIndex]?.id || 'admin';
    }
  }
};

const setActiveTab = (tabId: string) => {
  activeTabId.value = tabId;
};

defineExpose({ addTab, removeTab, setActiveTab });

// 监听标签页切换事件
let unsubscribeTabSwitched: (() => void) | null = null;
let unsubscribeTabCreated: (() => void) | null = null;
let unsubscribeTabClosed: (() => void) | null = null;

onMounted(() => {
  // 如果不是 Electron 环境，不初始化标签页功能
  if (!hasTabs.value) return;

  // 初始化拖拽排序
  if (tabBarRef.value) {
    sortableInstance = Sortable.create(tabBarRef.value, {
      animation: 150,
      delay: 100,
      delayOnTouchOnly: true,
      onEnd: () => {
        const newOrder = tabs.value.map(t => t.id);
        electronApi.tab.reorderTabs(newOrder);
      }
    });
  }

  // 监听标签页切换事件
  unsubscribeTabSwitched = electronApi.tab.onTabSwitched((tabId: string) => {
    activeTabId.value = tabId;
  });

  // 监听标签页创建事件
  unsubscribeTabCreated = electronApi.tab.onTabCreated((tab) => {
    addTab({ id: tab.id, title: tab.title, closable: true });
  });

  // 监听标签页关闭事件
  unsubscribeTabClosed = electronApi.tab.onTabClosed((tabId: string) => {
    removeTab(tabId);
  });
});

onUnmounted(() => {
  // 清理拖拽实例
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }

  // 清理事件监听
  unsubscribeTabSwitched?.();
  unsubscribeTabCreated?.();
  unsubscribeTabClosed?.();
});
</script>

<style scoped>
.tab-bar {
  display: flex;
  height: 40px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  user-select: none;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 16px;
  cursor: pointer;
  border-right: 1px solid #ddd;
  background-color: #e8e8e8;
  transition: background-color 0.2s;
  min-width: 100px;
  max-width: 200px;
}

.tab-item:hover {
  background-color: #ddd;
}

.tab-item.active {
  background-color: #fff;
  border-bottom: 2px solid #409eff;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.tab-close {
  margin-left: 8px;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: all 0.2s;
}

.tab-close:hover {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.1);
}
</style>
