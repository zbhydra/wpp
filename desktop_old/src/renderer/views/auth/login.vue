<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <el-icon size="28"><Lock /></el-icon>
          <span class="title">{{ t('auth.login.title') }}</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
      >
        <el-form-item :label="t('auth.login.email')" prop="email">
          <el-input
            v-model="form.email"
            :placeholder="t('auth.login.emailPlaceholder')"
            clearable
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item :label="t('auth.login.password')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="t('auth.login.passwordPlaceholder')"
            show-password
            @keyup.enter="handleLogin"
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
            @click="handleLogin"
          >
            {{ t('auth.login.submit') }}
          </el-button>
        </el-form-item>

        <div class="footer-link">
          <span>{{ t('auth.login.noAccount') }}</span>
          <el-link type="primary" @click="router.push('/register')">
            {{ t('auth.login.goRegister') }}
          </el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { Lock, User } from '@element-plus/icons-vue';
import { httpApi } from '@/api/http';

const router = useRouter();
const { t } = useI18n();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  email: '',
  password: '',
});

const rules: FormRules = {
  email: [
    { required: true, message: t('auth.login.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.login.emailInvalid'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.login.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('auth.login.passwordMinLength'), trigger: 'blur' },
  ],
};

const handleLogin = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    try {
      await httpApi.auth.login({
        email: form.email,
        password: form.password,
      });

      ElMessage.success(t('auth.login.success'));
      router.push('/dashboard');
    } catch (error: any) {
      ElMessage.error(error.message || t('auth.login.failed'));
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
}

.title {
  color: #2c3e50;
}

:deep(.el-form-item__label) {
  color: #606266;
}

.footer-link {
  text-align: center;
  color: #606266;
  font-size: 14px;
}

.footer-link .el-link {
  margin-left: 4px;
}
</style>
