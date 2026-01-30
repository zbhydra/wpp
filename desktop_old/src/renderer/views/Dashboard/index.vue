<template>
  <div class="dashboard">
    <el-card class="welcome-card">
      <template #header>
        <div class="card-header">
          <el-icon size="24"><Promotion /></el-icon>
          <span class="title">{{ t('dashboard.welcome') }}</span>
        </div>
      </template>

      <div class="welcome-content">
        <p class="description">{{ t('dashboard.description') }}</p>
        <p class="version">{{ t('common.version') }}: v1.0.0</p>

        <el-divider />

        <!-- 性能数据 -->
        <div class="performance-section">
          <h3>性能数据</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="启动到 App 初始化">
              {{ performanceData.appInit }} ms
            </el-descriptions-item>
            <el-descriptions-item label="Vue 挂载">
              {{ performanceData.vueMount }} ms
            </el-descriptions-item>
            <el-descriptions-item label="页面加载">
              {{ performanceData.pageLoad }} ms
            </el-descriptions-item>
            <el-descriptions-item label="DOM 解析">
              {{ performanceData.domParse }} ms
            </el-descriptions-item>
            <el-descriptions-item label="资源加载" :span="2">
              {{ performanceData.resourceLoad }} ms
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <el-divider />

        <div class="quick-start">
          <h3>{{ t('dashboard.quickStart') }}</h3>
          <el-space :size="16" direction="vertical" style="width: 100%">
            <div class="step-item">
              <el-icon color="#42b983"><CircleCheck /></el-icon>
              <span>{{ t('dashboard.step1') }}</span>
            </div>
            <div class="step-item">
              <el-icon color="#42b983"><CircleCheck /></el-icon>
              <span>{{ t('dashboard.step2') }}</span>
            </div>
            <div class="step-item">
              <el-icon color="#42b983"><CircleCheck /></el-icon>
              <span>{{ t('dashboard.step3') }}</span>
            </div>
          </el-space>
        </div>

        <el-divider />

        <div class="actions">
          <el-button type="primary" size="large" @click="goToAccounts">
            <el-icon><ChatLineSquare /></el-icon>
            {{ t('dashboard.manageAccount') }}
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Promotion, CircleCheck, ChatLineSquare } from '@element-plus/icons-vue';

const router = useRouter();
const { t } = useI18n();

// 性能数据
const performanceData = ref({
  appInit: 0,
  vueMount: 0,
  pageLoad: 0,
  domParse: 0,
  resourceLoad: 0,
});

onMounted(() => {
  const perfData = window.performance.timing;
  const navigationStart = perfData.navigationStart;

  performanceData.value = {
    appInit: Math.round(perfData.responseStart - navigationStart),
    vueMount: Math.round(perfData.domContentLoadedEventStart - navigationStart),
    pageLoad: Math.round(perfData.loadEventStart - navigationStart),
    domParse: Math.round(perfData.domComplete - perfData.domInteractive),
    resourceLoad: Math.round(perfData.loadEventStart - perfData.domContentLoadedEventEnd),
  };
});

const goToAccounts = () => {
  router.push('/whatsapp/accounts');
};
</script>

<style scoped>
.dashboard {
  max-width: 800px;
  margin: 0 auto;
}

.welcome-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.title {
  color: #2c3e50;
}

.performance-section {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.performance-section h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.welcome-content {
  padding: 20px 0;
}

.description {
  font-size: 16px;
  color: #606266;
  text-align: center;
  margin: 0 0 10px 0;
}

.version {
  font-size: 14px;
  color: #909399;
  text-align: center;
  margin: 0;
}

.quick-start {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.quick-start h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}

.actions {
  text-align: center;
  padding: 20px 0 0 0;
}
</style>
