<template>
  <el-dropdown @command="handleLanguageChange" class="language-switcher">
    <span class="language-selector">
      <el-icon><Switch /></el-icon>
      <span class="language-text">{{ currentLanguageLabel }}</span>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="zh-cn">简体中文</el-dropdown-item>
        <el-dropdown-item command="en">English</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Switch } from '@element-plus/icons-vue';

const { locale } = useI18n();

const languageMap: Record<string, string> = {
  'zh-cn': '简体中文',
  en: 'English',
};

const currentLanguageLabel = computed(() => {
  return languageMap[locale.value] || '简体中文';
});

const handleLanguageChange = (lang: string) => {
  locale.value = lang;
  localStorage.setItem('language', lang);
};
</script>

<style scoped>
.language-switcher {
  cursor: pointer;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.language-selector:hover {
  background-color: var(--el-fill-color-light);
}

.language-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
