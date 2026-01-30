/**
 * WhatsApp Preload 入口文件
 * 协调所有模块的初始化流程
 */

import { hideElectronFeatures } from './security/anti-detection';
import { injectWaJS } from './injectors/wa-js-injector';
import { setupCommandListener } from './commands/command-handler';
import { exposeWhatsAppAPI, whatsappAPI } from './api/whatsapp-api';
import { contextBridge } from 'electron';

/**
 * 初始化流程
 */
function initialize(): void {
  console.log('[WA-JS] Preload script initialized');
  console.log('[WA-JS] process.argv:', process.argv);

  // 1. 隐藏 Electron 特征（立即执行，必须在页面加载前）
  hideElectronFeatures();

  // 2. 注入 wa-js（会在内部等待 DOMContentLoaded，完成后自动设置事件监听）
  injectWaJS();

  // 3. 设置命令监听器（不依赖 WPP，可立即执行）
  setupCommandListener();

  // 4. 暴露 API
  // exposeWhatsAppAPI();
  contextBridge.exposeInMainWorld('whatsappAPI', whatsappAPI);
}

// 执行初始化
initialize();
