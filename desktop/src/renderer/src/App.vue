<template>
  <div class="app-container">
    <h1>Hello Desktop</h1>
    <p>WPP Desktop is running!</p>
    <div class="versions">
      <p>Node: {{ versions.node }}</p>
      <p>Chrome: {{ versions.chrome }}</p>
      <p>Electron: {{ versions.electron }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface ElectronAPI {
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const versions = ref({
  node: '',
  chrome: '',
  electron: '',
});

onMounted(() => {
  if (window.electronAPI) {
    versions.value = window.electronAPI.versions;
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h1 {
  color: #42b883;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  color: #666;
  font-size: 1.1rem;
}

.versions {
  margin-top: 2rem;
  padding: 1rem 2rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.versions p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #888;
}
</style>
