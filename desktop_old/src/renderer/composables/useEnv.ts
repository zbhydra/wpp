import { reactive, readonly } from 'vue';
import { detectEnvironment, type EnvState } from '@/shared/env';

/**
 * 全局环境状态
 * 在应用启动时初始化，整个应用生命周期内保持不变
 */
const envState = reactive<EnvState>({
    runtimeEnvironment: detectEnvironment(),
    isElectron: detectEnvironment() === 'electron',
    isBrowser: detectEnvironment() === 'browser',
});

/**
 * 环境状态 Composable
 * @returns 只读的环境状态
 */
export function useEnv() {
    return readonly(envState);
}
