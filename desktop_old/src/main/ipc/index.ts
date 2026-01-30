import { WhatsAppAccountManager } from '../whatsapp/WhatsAppAccountManager';
import { BrowserViewManager } from '../BrowserViewManager';
import { registerWaJsHandlers } from './handlers/wa-js';
import { registerWhatsAppHandler } from '../whatsapp/WhatsAppHandler';
import { registerTabHandlers } from './handlers/tab';

/**
 * 注册所有 IPC handlers
 */
export function setupIPCHandlers(
  accountManager: WhatsAppAccountManager,
  viewManager: BrowserViewManager
): void {
  registerWaJsHandlers();
  registerWhatsAppHandler(accountManager);
  registerTabHandlers(viewManager, accountManager);
}
