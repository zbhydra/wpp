import { _electron as electron, expect } from '@playwright/test';
import path from 'path';

/**
 * 基础交互测试示例
 * 
 * 演示最基础的 E2E 流程: 点击 -> 输入 -> 点击
 */

test.describe('基础交互', () => {
  test('点击 A 按钮 -> 输入 B -> 点击 C', async () => {
    // 1. 启动 Electron 应用
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../')],
      executablePath: path.join(__dirname, '../../node_modules/.bin/electron'),
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 2. 点击 A 按钮 (管理账号按钮)
    const buttonA = window.getByText('管理账号');
    await buttonA.click();
    console.log('✓ 点击了"管理账号"按钮');

    // 等待页面跳转
    await window.waitForTimeout(500);

    // 3. 点击"添加账号"按钮
    const addButton = window.locator('button').filter({ hasText: '添加账号' });
    await addButton.click();
    console.log('✓ 点击了"添加账号"按钮');

    // 4. 输入 B (账号名称)
    const nameInput = window.locator('.el-input__inner').first();
    await nameInput.fill('测试账号_001');
    console.log('✓ 输入了账号名称: 测试账号_001');

    // 5. 点击 C (创建账号按钮)
    const createButton = window.locator('button').filter({ hasText: '创建账号' });
    await createButton.click();
    console.log('✓ 点击了"创建账号"按钮');

    // 等待操作完成
    await window.waitForTimeout(1000);

    // 关闭应用
    await electronApp.close();
  });
});
