# 004. 前端实现与 Vben 集成 (Frontend Implementation)

本阶段目标是在 `apps/web-antd` 中创建 UI，控制主进程的 WhatsApp 视图，并展示状态。

## 1. 布局与窗口控制 (Layout & Window Controls)

为了实现类似浏览器的体验，我们需要定制 Vben 的 Layout。

### 1.1 禁用原生标题栏
在 `apps/electron-main/src/main.ts` 创建窗口时：
```typescript
const win = new BaseWindow({
  titleBarStyle: 'hidden', // macOS 隐藏标题栏但保留红绿灯 (或者用 hiddenInset)
  // frame: false, // Windows/Linux 使用无边框
  // ...
});
```

### 1.2 定制 Vben 布局
在 `apps/web-antd/src/layouts` 下可能需要调整默认布局配置：
*   **隐藏侧边栏 (Sidebar)**：如果用户希望像浏览器一样全屏显示 WA，可以默认收起或隐藏侧边栏，只保留顶部的 Tabs。
*   **集成窗口控制按钮**：
    *   在 Vben 的 Header 或 TabBar 右侧区域，添加三个按钮 (Min, Max, Close)。
    *   绑定点击事件 -> `ipcRenderer.send('window:minimize')` 等。
    *   CSS 设置 `-webkit-app-region: no-drag` 确保按钮可点击，而顶部其他空白区域设置 `-webkit-app-region: drag` 用于拖拽窗口。

## 2. 路由与页面规划

在 `apps/web-antd/src/router/routes/modules` 下新建 `whatsapp.ts`。

### 1.1 路由定义

```typescript
import type { RouteRecordRaw } from 'vue-router';
import { LAYOUT } from '@/router/constant';

const whatsapp: RouteRecordRaw = {
  path: '/whatsapp',
  name: 'Whatsapp',
  component: LAYOUT,
  meta: {
    title: 'WhatsApp 管理',
    icon: 'ic:baseline-whatsapp',
    orderNo: 10,
  },
  children: [
    {
      path: 'accounts',
      name: 'WhatsappAccounts',
      component: () => import('@/views/whatsapp/accounts/index.vue'),
      meta: {
        title: '账号列表',
      },
    },
    {
      path: 'chat/:id',
      name: 'WhatsappChat',
      component: () => import('@/views/whatsapp/chat/index.vue'),
      meta: {
        title: '聊天窗口',
        hideMenu: true, // 在侧边栏隐藏具体的聊天 ID
      },
    },
  ],
};

export default whatsapp;
```

## 2. 核心组件开发

### 2.1 账号列表页 (`views/whatsapp/accounts/index.vue`)

使用 Vben 的 `UseTable` 钩子快速创建列表。

*   **列定义**：头像、昵称、状态 (在线/离线)、代理地址、最后活跃时间、操作列。
*   **操作**：
    *   **添加账号**：弹窗输入代理 IP，调用 `ipcRenderer.invoke('account:create')`。
    *   **打开**：跳转到 `/whatsapp/chat/:id`。
    *   **删除**：调用 `ipcRenderer.invoke('account:delete')`。

### 2.2 聊天占位页 (`views/whatsapp/chat/index.vue`)

这是最关键的组件，它本身不渲染 WhatsApp，而是作为一个**定位锚点**。

```vue
<template>
  <div class="h-full w-full flex flex-col overflow-hidden">
    <!-- 顶部工具栏 (Vben UI) -->
    <div class="h-12 bg-white border-b flex items-center px-4 justify-between">
      <span class="font-bold">账号: {{ currentAccount?.name }}</span>
      <div class="space-x-2">
        <a-button @click="reloadPage">刷新页面</a-button>
        <a-button @click="toggleDevTools">开发者工具</a-button>
      </div>
    </div>

    <!-- 占位容器 (Electron View 将覆盖在此处) -->
    <!-- 注意：必须保证它是透明的或者空的，但这里是占位，View是覆盖在上面的，所以这里的内容其实看不见 -->
    <div ref="containerRef" class="flex-1 bg-gray-50 relative">
        <div class="absolute center text-gray-400">
            WhatsApp 正在加载...
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useElementBounding } from '@vueuse/core';

const route = useRoute();
const containerRef = ref<HTMLElement | null>(null);
// 使用 VueUse 实时获取元素的坐标和宽高
const { x, y, width, height } = useElementBounding(containerRef);

// 核心：同步坐标给主进程
const syncBounds = () => {
    if (!containerRef.value) return;
    
    // 注意：getBoundingClientRect 获取的是相对于视口的坐标
    // 如果有顶栏、侧边栏，这个坐标是准确的
    // 但需要考虑 DevicePixelRatio (Mac Retina 屏幕)
    const rect = containerRef.value.getBoundingClientRect();
    
    window.electron.ipcRenderer.send('whatsapp:view-resize', {
        id: route.params.id,
        rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        }
    });
};

// 监听坐标变化 (窗口缩放、侧边栏折叠都会触发)
watch([x, y, width, height], () => {
    syncBounds();
});

onMounted(() => {
    // 告诉主进程：挂载视图
    window.electron.ipcRenderer.send('whatsapp:view-attach', { id: route.params.id });
    // 初始同步一次
    setTimeout(syncBounds, 100);
});

onBeforeUnmount(() => {
    // 告诉主进程：卸载视图 (隐藏)
    window.electron.ipcRenderer.send('whatsapp:view-detach', { id: route.params.id });
});
</script>
```

## 3. 状态管理 (Pinia Store)

创建 `apps/web-antd/src/store/modules/whatsapp.ts`。

*   **State**: `accounts[]` (包含 ID, Name, Status, Proxy, UnreadCount)。
*   **Actions**:
    *   `fetchAllAccounts()`: 启动时从主进程拉取。
    *   `updateAccountStatus(id, status)`: 被 IPC 事件调用。

在 `App.vue` 或全局入口处，监听 IPC 事件：

```typescript
// apps/web-antd/src/App.vue

onMounted(() => {
  const whatsappStore = useWhatsappStore();
  
  // 监听来自主进程的全局广播
  window.electron.ipcRenderer.on('whatsapp:status-changed', (event, { id, status }) => {
    whatsappStore.updateStatus(id, status);
  });
  
  window.electron.ipcRenderer.on('whatsapp:message-received', (event, { id, message }) => {
    notification.success({ message: `账号 ${id} 收到新消息` });
    whatsappStore.incrementUnread(id);
  });
});
```

## 4. UI 细节优化

*   **加载状态**：在 `ViewManager` 加载 URL 期间，Vue 组件可以显示一个 Ant Design 的 `Spin` 加载动画。一旦 WebContentsView 的 `did-finish-load` 事件触发，主进程通知 Vue 隐藏 Spin。
*   **侧边栏徽标**：修改 Vben 的 Menu 渲染逻辑（如果支持 Slot），或者通过 DOM 操作，在侧边栏对应账号的图标上显示未读消息红点。

**下一步**：阅读 `gemini-005-isolation-and-proxy.md`，深入理解隔离机制的验证方法。
