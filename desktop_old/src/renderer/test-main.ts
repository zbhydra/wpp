// Test page entry - just like main.ts
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import AppTest from './AppTest.vue';

const start = Date.now();
console.log('[TEST] Starting at:', start);

const app = createApp(AppTest);

app.use(ElementPlus);
app.mount('#app');

document.body.style.backgroundColor = 'lightyellow';
console.log('[TEST] App mounted after:', Date.now() - start, 'ms');
