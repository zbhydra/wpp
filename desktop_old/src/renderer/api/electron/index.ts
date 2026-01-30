/**
 * Electron API 统一导出
 */

export { WhatsAppElectronAPI } from './whatsapp_api';
export { TabElectronAPI } from './tab_api';

import { WhatsAppElectronAPI } from './whatsapp_api';
import { TabElectronAPI } from './tab_api';

/**
 * 检查是否在 Electron 环境
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

/**
 * Electron API 实例（懒加载，仅在 Electron 环境中可用）
 */
class ElectronAPIs {
  private _whatsapp: WhatsAppElectronAPI | null = null;
  private _tab: TabElectronAPI | null = null;

  get whatsapp(): WhatsAppElectronAPI {
    if (!this._whatsapp) {
      if (!isElectronEnvironment()) {
        throw new Error('WhatsApp API is only available in Electron environment');
      }
      this._whatsapp = new WhatsAppElectronAPI();
    }
    return this._whatsapp;
  }

  get tab(): TabElectronAPI {
    if (!this._tab) {
      if (!isElectronEnvironment()) {
        throw new Error('Tab API is only available in Electron environment');
      }
      this._tab = new TabElectronAPI();
    }
    return this._tab;
  }

  /**
   * 检查是否在 Electron 环境
   */
  get isAvailable(): boolean {
    return isElectronEnvironment();
  }
}

export const electronApi = new ElectronAPIs();
