<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="t('message.title')"
    direction="rtl"
    size="400px"
  >
    <div class="send-message-drawer">
      <!-- 账号信息 -->
      <div class="account-info">
        <span class="label">{{ t('account.name') }}：</span>
        <span class="value">{{ accountName }}</span>
      </div>

      <!-- 发送表单 -->
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('message.to')" prop="to">
          <el-input
            v-model="form.to"
            :placeholder="t('message.toPlaceholder')"
            clearable
          />
        </el-form-item>

        <el-form-item :label="t('message.content')" prop="message">
          <el-input
            v-model="form.message"
            type="textarea"
            :rows="6"
            :placeholder="t('message.contentPlaceholder')"
            maxlength="4096"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <div class="button-group">
            <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!canSend"
              @click="handleSend"
            >
              {{ t('common.send') }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <!-- 发送历史 -->
      <MessageHistory
        v-if="modelValue"
        ref="historyRef"
        :account-id="accountId"
      />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { httpApi, electronApi } from '@/api';
import { useEnv } from '@/composables/useEnv';
import MessageHistory from './MessageHistory.vue';
import type { Account } from '@/shared/storage-interface';

const props = defineProps<{
  modelValue: boolean;
  accountId: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  sent: [result: any];
}>();

const { t } = useI18n();
const env = useEnv();
const canSendWhatsAppMessage = computed(() => env.isElectron);

const formRef = ref<FormInstance>();
const historyRef = ref<InstanceType<typeof MessageHistory>>();
const sending = ref(false);

const form = ref({
  to: '8613798976121',
  message: 'hello',
});

// 格式化手机号为 WhatsApp 标准格式
const formatWhatsAppPhone = (input: string): string => {
  let phone = input.trim();

  // 去掉 + 号
  phone = phone.replace(/\+/g, '');

  // 去掉所有空格
  phone = phone.replace(/\s/g, '');

  // 如果没有 @c.us 后缀，添加它
  if (!phone.endsWith('@c.us')) {
    phone += '@c.us';
  }

  return phone;
};

const rules: FormRules = {
  to: [
    { required: true, message: t('message.to'), trigger: 'blur' },
  ],
  message: [
    { required: true, message: t('message.contentPlaceholder'), trigger: 'blur' },
    { min: 1, max: 4096, message: '消息内容长度为1-4096个字符', trigger: 'blur' },
  ],
};

// 获取账号名称（临时显示 ID）
const accountName = computed(() => {
  return props.accountId || t('account.name');
});

// 是否可以发送
const canSend = computed(() => {
  return canSendWhatsAppMessage.value && form.value.to.trim() && form.value.message.trim() && !sending.value;
});

// 发送消息
const handleSend = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    sending.value = true;

    // 格式化手机号
    const formattedPhone = formatWhatsAppPhone(form.value.to);

    // 调用发送命令
    const result = await electronApi.whatsapp.sendMessage(
      props.accountId,
      formattedPhone,
      form.value.message
    );

    // 保存到历史
    await httpApi.messages.createMessage(props.accountId, {
      to_phone: formattedPhone,
      message_content: form.value.message,
    });

    // 刷新历史
    if (historyRef.value) {
      historyRef.value.refresh();
    }

    // 清空表单
    form.value.to = '';
    form.value.message = '';
    formRef.value.clearValidate();

    ElMessage.success(t('message.sendSuccess'));
    emit('sent', result);
  } catch (error: any) {
    console.error('Failed to send message:', error);

    // 保存失败记录
    const formattedPhone = formatWhatsAppPhone(form.value.to);
    await httpApi.messages.createMessage(props.accountId, {
      to_phone: formattedPhone,
      message_content: form.value.message,
    });

    // 刷新历史
    if (historyRef.value) {
      historyRef.value.refresh();
    }

    ElMessage.error(error?.message || t('message.sendFailed'));
  } finally {
    sending.value = false;
  }
};

// 取消
const handleCancel = () => {
  form.value.to = '';
  form.value.message = '';
  formRef.value?.clearValidate();
  emit('update:modelValue', false);
};

// 监听抽屉打开，刷新历史
watch(() => props.modelValue, (newVal) => {
  if (newVal && historyRef.value) {
    historyRef.value.refresh();
  }
});
</script>

<style scoped>
.send-message-drawer {
  padding: 0 16px;
}

.account-info {
  padding: 12px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.account-info .label {
  color: var(--el-text-color-secondary);
  margin-right: 8px;
}

.account-info .value {
  font-weight: 500;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}
</style>
