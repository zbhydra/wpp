<template>
  <el-container class="admin-layout">
    <!-- 左侧菜单（仅在管理标签页显示） -->
    <el-aside v-show="isInAdminTab" width="200px" class="admin-aside">
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#2c3e50"
        text-color="#ffffff"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>{{ t('menu.dashboard') }}</span>
        </el-menu-item>

        <el-sub-menu index="whatsapp">
          <template #title>
            <el-icon><ChatLineSquare /></el-icon>
            <span>{{ t('menu.whatsapp') }}</span>
          </template>
          <el-menu-item index="/whatsapp/accounts">{{ t('menu.accountManager') }}</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container class="main-container">
      <!-- 顶部栏（仅在管理标签页显示） -->
      <el-header v-show="isInAdminTab" class="admin-header">
        <div class="header-content">
          <div class="breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <LanguageSwitcher />
            <div class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">Admin</span>
            </div>
          </div>
        </div>
      </el-header>

      <!-- 主内容区（仅在管理标签页显示） -->
      <el-main v-show="isInAdminTab" class="admin-main">
        <div class="main-content-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Odometer, ChatLineSquare, UserFilled } from '@element-plus/icons-vue';
import { electronApi } from '@/api';
import { useEnv } from '@/composables/useEnv';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const route = useRoute();
const { t } = useI18n();
const env = useEnv();
const hasTabs = computed(() => env.isElectron);

const currentTabId = ref('admin');

// 是否在管理标签页
const isInAdminTab = computed(() => !hasTabs.value || currentTabId.value === 'admin');

// 当前激活的菜单
const activeMenu = computed(() => {
  return route.path;
});

// 当前页面标题
const currentTitle = computed(() => {
  const title = route.meta.title as string;
  if (title === 'Dashboard') return t('menu.dashboard');
  if (title === '账号管理') return t('menu.accountManager');
  return title;
});

// 监听标签页切换事件
let unsubscribeTabSwitched: (() => void) | null = null;

onMounted(() => {
  if (!hasTabs.value) return;
  unsubscribeTabSwitched = electronApi.tab.onTabSwitched((tabId: string) => {
    currentTabId.value = tabId;
  });
});

onUnmounted(() => {
  unsubscribeTabSwitched?.();
});
</script>

<style scoped>
.admin-layout {
  height: 100%;
  display: flex;
  flex-direction: row;
}

.admin-aside {
  background-color: #2c3e50;
  color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.el-menu {
  border-right: none;
  background-color: #2c3e50;
  flex: 1;
  overflow-y: auto;
}

.el-menu-item,
.el-sub-menu__title {
  color: #ffffff !important;
}

.el-menu-item:hover,
.el-sub-menu__title:hover {
  background-color: #34495e !important;
}

.el-menu-item.is-active {
  background-color: #42b983 !important;
  color: #fff !important;
}

/* 子菜单项颜色 */
.el-menu--vertical .el-sub-menu .el-menu-item {
  background-color: #233140 !important;
  color: #ffffff !important;
}

.el-menu--vertical .el-sub-menu .el-menu-item:hover {
  background-color: #34495e !important;
}

.main-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.admin-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  flex-shrink: 0;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-size: 14px;
  color: #606266;
}

.admin-main {
  background-color: #f5f7fa;
  padding: 20px;
  padding-right: 25px;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-content-wrapper {
  flex: 1;
  overflow-y: auto;
}
</style>
