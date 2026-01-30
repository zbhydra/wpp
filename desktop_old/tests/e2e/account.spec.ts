import { _electron as electron, expect } from '@playwright/test';
import path from 'path';

/**
 * Electron E2E 测试示例
 * 
 * 测试流程:
 * 1. 启动 Electron 应用
 * 2. 点击"添加账号"按钮
 * 3. 输入账号名称
 * 4. 点击创建按钮
 */

test.describe('账号管理', () => {
  let electronApp;

  test.beforeAll(async () => {
    // 启动 Electron 应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../')],
      executablePath: path.join(__dirname, '../../node_modules/.bin/electron'),
    });
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('应该能打开应用并显示欢迎页', async () => {
    const window = await electronApp.firstWindow();
    
    // 等待页面加载
    await window.waitForLoadState('domcontentloaded');
    
    // 验证标题
    const title = await window.title();
    expect(title).toContain('wpp-manager');
  });

  test('应该能点击按钮并输入内容', async () => {
    const window = await electronApp.firstWindow();
    
    // 等待 Vue Router 导航到账号页面
    await window.waitForTimeout(1000);
    
    // 点击"添加账号"按钮 (Element Plus button with type="primary")
    const addButton = window.getByText('添加账号').or(
      window.locator('button').filter({ hasText: '添加账号' })
    );
    await addButton.click();
    
    // 输入账号名称
    const nameInput = window.locator('input[placeholder*="账号名称"]').or(
      window.locator('.el-input__inner')
    ).first();
    await nameInput.fill('测试账号');
    
    // 点击创建按钮
    const createButton = window.getByText('创建账号').or(
      window.locator('button').filter({ hasText: '创建账号' })
    );
    await createButton.click();
    
    // 等待操作完成
    await window.waitForTimeout(1000);
  });

  test('应该能导航到账号管理页面', async () => {
    const window = await electronApp.firstWindow();
    
    // 点击"管理账号"按钮
    const manageButton = window.getByText('管理账号').or(
      window.locator('button').filter({ hasText: '管理账号' })
    );
    await manageButton.click();
    
    // 等待路由跳转
    await window.waitForTimeout(500);
    
    // 验证 URL 变化
    expect(window.url()).toContain('/whatsapp/accounts');
  });
});
