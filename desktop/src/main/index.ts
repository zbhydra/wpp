import { app } from 'electron';
import { Application } from './application';

/**
 * 应用入口
 * 
 * 职责：仅负责启动 Application 单例
 * 所有业务逻辑都在 Application 类中管理
 */
app.whenReady().then(() => {
  Application.getInstance().bootstrap();
});
