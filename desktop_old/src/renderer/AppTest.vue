<template>
  <div style="padding: 20px;">
    <h1>{{ message }}</h1>

    <el-card>
      <template #header>
        <span>Element Plus 测试</span>
      </template>
      <p>计数: {{ count }}</p>
      <el-button type="primary" @click="count++">点击 +1</el-button>
      <el-button @click="reset">重置</el-button>
    </el-card>

    <div style="margin-top: 20px;">
      <el-input v-model="inputText" placeholder="输入一些文字..." style="width: 300px;"></el-input>
      <p>输入内容: {{ inputText }}</p>
    </div>

    <div v-for="item in items" :key="item" style="padding: 10px; margin: 5px 0; border: 1px solid #eee; border-radius: 4px;">
      <el-tag>{{ item }}</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const message = ref('Vue 3 + Element Plus (正常构建) 加载成功！');
const count = ref(0);
const inputText = ref('');
const items = ref([]);

for (let i = 0; i < 10; i++) {
  items.value.push(`Item ${i}`);
}

const reset = () => {
  count.value = 0;
  inputText.value = '';
};
</script>
