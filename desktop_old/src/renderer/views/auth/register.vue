<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">{{ t('auth.register.title') }}</h1>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        class="register-form"
      >
        <el-form-item :label="t('auth.register.email')" prop="email">
          <el-input
            v-model="form.email"
            :placeholder="t('auth.register.emailPlaceholder')"
            clearable
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('auth.register.fullName')" prop="full_name">
          <el-input
            v-model="form.full_name"
            :placeholder="t('auth.register.fullNamePlaceholder')"
            clearable
          >
            <template #prefix>
              <el-icon><Avatar /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="password-section">
          <el-form-item :label="t('auth.register.password')" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              :placeholder="t('auth.register.passwordPlaceholder')"
              show-password
              @keyup.enter="handleRegister"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <div v-if="form.password" class="password-strength-card">
            <div class="strength-header">
              <span class="strength-label">{{ t('auth.register.strengthLabel') }}</span>
              <span class="strength-value" :data-strength="strengthLevel">{{ strengthText }}</span>
            </div>
            <div class="strength-progress">
              <div class="strength-progress-bar" :style="{ width: strengthProgress + '%' }"></div>
            </div>
            <div class="strength-hints">
              <div :class="['hint-item', passwordLengthValid && 'valid']">
                <el-icon><Check v-if="passwordLengthValid" /><Close v-else /></el-icon>
                <span>{{ t('auth.register.hintLength') }}</span>
              </div>
              <div :class="['hint-item', passwordHasLowercase && 'valid']">
                <el-icon><Check v-if="passwordHasLowercase" /><Close v-else /></el-icon>
                <span>{{ t('auth.register.hintLowercase') }}</span>
              </div>
              <div :class="['hint-item', passwordHasUppercase && 'valid']">
                <el-icon><Check v-if="passwordHasUppercase" /><Close v-else /></el-icon>
                <span>{{ t('auth.register.hintUppercase') }}</span>
              </div>
              <div :class="['hint-item', passwordHasNumber && 'valid']">
                <el-icon><Check v-if="passwordHasNumber" /><Close v-else /></el-icon>
                <span>{{ t('auth.register.hintNumber') }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-form-item :label="t('auth.register.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            :placeholder="t('auth.register.confirmPasswordPlaceholder')"
            show-password
            @keyup.enter="handleRegister"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="handleRegister"
          >
            {{ t('auth.register.submit') }}
          </el-button>
        </el-form-item>

        <div class="footer-link">
          <span>{{ t('auth.register.hasAccount') }}</span>
          <el-link type="primary" @click="router.push('/login')">
            {{ t('auth.register.goLogin') }}
          </el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { User, Avatar, Lock, Check, Close } from '@element-plus/icons-vue';
import { httpApi } from '@/api/http';

const router = useRouter();
const { t } = useI18n();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  email: '',
  full_name: '',
  password: '',
  confirmPassword: '',
});

// 密码验证条件
const passwordLengthValid = computed(() => form.password.length >= 6);
const passwordHasLowercase = computed(() => /[a-z]/.test(form.password));
const passwordHasUppercase = computed(() => /[A-Z]/.test(form.password));
const passwordHasNumber = computed(() => /\d/.test(form.password));

// 密码强度计算
const strengthLevel = computed(() => {
  const conditions = [
    passwordLengthValid.value,
    passwordHasLowercase.value,
    passwordHasUppercase.value,
    passwordHasNumber.value,
  ];
  const score = conditions.filter(Boolean).length;

  if (score <= 1) return 'weak';
  if (score <= 2) return 'medium';
  return 'strong';
});

// 密码强度进度百分比
const strengthProgress = computed(() => {
  const level = strengthLevel.value;
  if (level === 'weak') return 33;
  if (level === 'medium') return 66;
  return 100;
});

// 密码强度文本
const strengthText = computed(() => {
  return t(`auth.register.strengthLevels.${strengthLevel.value}`);
});

// 自定义密码验证器
const validatePassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error(t('auth.register.passwordRequired')));
    return;
  }

  if (value.length < 8) {
    callback(new Error(t('auth.register.passwordMinLength')));
    return;
  }

  if (!/[a-z]/.test(value)) {
    callback(new Error(t('auth.register.passwordLowercase')));
    return;
  }

  if (!/[A-Z]/.test(value)) {
    callback(new Error(t('auth.register.passwordUppercase')));
    return;
  }

  if (!/\d/.test(value)) {
    callback(new Error(t('auth.register.passwordNumber')));
    return;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    callback(new Error(t('auth.register.passwordSpecial')));
    return;
  }

  callback();
};

// 自定义确认密码验证器
const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error(t('auth.register.confirmPasswordRequired')));
    return;
  }
  if (value !== form.password) {
    callback(new Error(t('auth.register.confirmPasswordMismatch')));
    return;
  }
  callback();
};

const rules: FormRules = {
  email: [
    { required: true, message: t('auth.register.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.register.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, validator: validatePassword, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' },
  ],
};

const handleRegister = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    try {
      await httpApi.auth.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name || undefined,
      });

      ElMessage.success(t('auth.register.success'));

      // 注册成功后自动登录
      await httpApi.auth.login({
        email: form.email,
        password: form.password,
      });

      router.push('/dashboard');
    } catch (error: any) {
      ElMessage.error(error.message || t('auth.register.failed'));
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.register-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24px;
}

.register-card {
  width: 100%;
  max-width: 400px;
  background-color: transparent;
}

.title {
  font-size: 24px;
  font-weight: 500;
  color: #333333;
  text-align: center;
  margin-bottom: 24px;
}

.register-form {
  width: 100%;
}

/* 表单标签样式 */
:deep(.el-form-item__label) {
  color: #666666;
  font-size: 14px;
  font-weight: 400;
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  background-color: #ffffff;
  border: 1px solid #dddddd;
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow: none;
  transition: border-color 0.2s;
}

:deep(.el-input__wrapper:hover) {
  border-color: #dddddd;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #ff4d4f;
  box-shadow: none;
}

:deep(.el-input__inner) {
  font-size: 16px;
  color: #333333;
  font-weight: 400;
}

:deep(.el-input__inner::placeholder) {
  color: #999999;
}

/* 图标样式 */
:deep(.el-input__prefix) {
  color: #999999;
}

/* 密码区域 */
.password-section {
  position: relative;
}

/* 密码强度卡片 */
.password-strength-card {
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-top: 8px;
}

.strength-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.strength-label {
  font-size: 14px;
  color: #666666;
  font-weight: 400;
}

.strength-value {
  font-size: 14px;
  font-weight: 500;
  color: #ff4d4f;
}

.strength-value[data-strength="medium"] {
  color: #faad14;
}

.strength-value[data-strength="strong"] {
  color: #52c41a;
}

/* 强度进度条 */
.strength-progress {
  width: 100%;
  height: 4px;
  background-color: #eeeeee;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.strength-progress-bar {
  height: 100%;
  background-color: #ff4d4f;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.password-strength-card:has(.strength-value[data-strength="medium"]) .strength-progress-bar {
  background-color: #faad14;
}

.password-strength-card:has(.strength-value[data-strength="strong"]) .strength-progress-bar {
  background-color: #52c41a;
}

/* 强度提示列表 */
.strength-hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
}

.hint-item .el-icon {
  font-size: 16px;
  color: #ff4d4f;
}

.hint-item.valid .el-icon {
  color: #52c41a;
}

.hint-item.valid span {
  color: #52c41a;
}

/* 按钮样式 */
:deep(.el-button--primary) {
  background-color: #1890ff;
  border-color: #1890ff;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 400;
  height: 48px;
}

:deep(.el-button--primary:hover) {
  background-color: #40a9ff;
  border-color: #40a9ff;
}

/* 底部链接 */
.footer-link {
  text-align: center;
  color: #666666;
  font-size: 14px;
  margin-top: 16px;
}

.footer-link .el-link {
  margin-left: 4px;
  font-size: 14px;
}
</style>
