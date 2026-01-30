import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getEventService } from '../services/EventService';
import { WhatsAppAccountManager } from './WhatsAppAccountManager';
import { SendMessageResult } from '../types';
import { messageHistoryService } from './WhatsAppMessageHistory';

/**
 * 注册 WhatsApp 相关的 IPC handlers
 */
export function registerWhatsAppHandler(accountManager: WhatsAppAccountManager): void {
    const eventService = getEventService();

    // 发送命令到 WhatsApp View（消息转发）
    ipcMain.handle(
        'whatsapp:sendCommand',
        async (_event: IpcMainInvokeEvent, accountId: string, command: string, data?: any) => {
            eventService.forwardToWhatsAppView(accountId, command, data);
        }
    );

    // 【renderer -> main 】 获取账号列表
    ipcMain.handle('whatsapp:getAccounts', () => {
        return accountManager.getAccounts();
    });

    // 【renderer -> main 】  启动账号
    ipcMain.handle('whatsapp:startAccount', async (_event: IpcMainInvokeEvent, accountId: string) => {
        await accountManager.startAccount(accountId);
    });

    // 【renderer -> main 】  停止账号
    ipcMain.handle('whatsapp:stopAccount', async (_event: IpcMainInvokeEvent, accountId: string) => {
        await accountManager.stopAccount(accountId);
    });

    // 【renderer -> main 】  删除账号
    ipcMain.handle('whatsapp:deleteAccount', async (_event: IpcMainInvokeEvent, accountId: string) => {
        await accountManager.deleteAccount(accountId);
    });

    // 【renderer -> main 】  重命名账号
    ipcMain.handle(
        'whatsapp:renameAccount',
        async (_event: IpcMainInvokeEvent, accountId: string, newName: string) => {
            await accountManager.renameAccount(accountId, newName);
        }
    );

    // 【renderer -> main 】  创建新账号
    ipcMain.handle('whatsapp:createAccount', async (_event: IpcMainInvokeEvent, name: string) => {
        return await accountManager.createAccount(name);
    });





    // 【renderer -> main 】  保存消息历史
    ipcMain.handle(
        'messageHistory:save',
        async (_event: IpcMainInvokeEvent, accountId: string, result: SendMessageResult) => {
            return messageHistoryService.addMessage(accountId, result);
        }
    );

    // 【renderer -> main 】  获取消息历史
    ipcMain.handle('messageHistory:get', async (_event: IpcMainInvokeEvent, accountId: string) => {
        return messageHistoryService.getHistory(accountId);
    });

    // 【renderer -> main 】  删除消息历史
    ipcMain.handle(
        'messageHistory:delete',
        async (_event: IpcMainInvokeEvent, accountId: string, recordId: string) => {
            return messageHistoryService.deleteMessage(accountId, recordId);
        }
    );

    // 【renderer -> main 】  清空消息历史
    ipcMain.handle('messageHistory:clear', async (_event: IpcMainInvokeEvent, accountId: string) => {
        messageHistoryService.clearHistory(accountId);
    });

}
