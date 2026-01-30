/**
 * 账号工具模块
 */

/**
 * 获取当前账号 ID
 * 从 additionalArguments 中获取 --accountid=xxx (注意 Electron 会转小写)
 */
export function getAccountId(): string {
  const arg = process.argv.find((arg) => arg.startsWith('--accountid='));
  if (arg) {
    return arg.split('=')[1];
  }
  return 'unknown';
}
