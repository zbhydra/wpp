<template>
  <div class="account-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ t('account.title') }}</span>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            {{ t('account.addAccount') }}
          </el-button>
        </div>
      </template>

      <AccountList
        :accounts="accounts"
        @start="handleStart"
        @stop="handleStop"
        @delete="handleDelete"
        @batchDelete="handleBatchDelete"
        @rename="handleRename"
        @sendMessage="handleSendMessage"
      />
    </el-card>

    <!-- 创建账号对话框 -->
    <el-dialog v-model="showCreateDialog" :title="t('account.addAccount')" width="400px">
      <el-form @submit.prevent="handleCreateAccount">
        <el-form-item :label="t('account.name')">
          <el-input
            v-model="newAccountName"
            :placeholder="t('account.namePlaceholder')"
            @keyup.enter="handleCreateAccount"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleCreateAccount">{{ t('account.createAccount') }}</el-button>
      </template>
    </el-dialog>

    <!-- 发送消息抽屉 -->
    <SendMessageDrawer
      v-model="sendMessageDrawerVisible"
      :account-id="currentAccountId"
      @sent="handleMessageSent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { httpApi, electronApi } from '@/api';
import { useEnv } from '@/composables/useEnv';
import AccountList from '@/components/AccountList.vue';
import SendMessageDrawer from '@/components/SendMessageDrawer.vue';
import type { Account, AccountStatus } from '@/shared/storage-interface';

const { t } = useI18n();
const env = useEnv();
const canStartAccount = computed(() => env.isElectron);

const accounts = ref<Account[]>([]);
const showCreateDialog = ref(false);
const newAccountName = ref('');
const sendMessageDrawerVisible = ref(false);
const currentAccountId = ref('');

// 映射后端字段到前端格式
const mapAccount = (whatsapp_account: any): Account => ({
  id: whatsapp_account.id.toString(),
  name: whatsapp_account.account_name,
  status: (
    whatsapp_account.run_status === 1 ? AccountStatus.Stopped :
      whatsapp_account.run_status === 2 ? AccountStatus.Starting :
        whatsapp_account.run_status === 3 ? AccountStatus.QR :
          whatsapp_account.run_status === 4 ? AccountStatus.Ready : AccountStatus.Error
  ),
  phoneNumber: whatsapp_account.phone_number,
  error: whatsapp_account.error_message,
});

// 加载账号列表
const loadAccounts = async () => {
  try {
    const data = await httpApi.accounts.getAccounts();
    accounts.value = data.map(mapAccount);
  } catch (error) {
    console.error('Failed to load accounts:', error);
    ElMessage.error(t('account.loadFailed'));
  }
};

// 启动账号
const handleStart = async (account: Account) => {
  if (!canStartAccount.value) return;
  try {
    await electronApi.whatsapp.startAccount(account.id);
  } catch (error) {
    console.error('Failed to start account:', error);
    ElMessage.error(error instanceof Error ? error.message : t('account.startFailed'));
  }
};

// 停止账号
const handleStop = async (account: Account) => {
  if (!canStartAccount.value) return;
  try {
    await electronApi.whatsapp.stopAccount(account.id);
  } catch (error) {
    console.error('Failed to stop account:', error);
    ElMessage.error(t('account.stopFailed'));
  }
};

// 删除账号
const handleDelete = async (account: Account) => {
  try {
    await httpApi.accounts.deleteAccount(account.id);
    ElMessage.success(t('account.deleteSuccess'));
  } catch (error) {
    console.error('Failed to delete account:', error);
    ElMessage.error(t('account.deleteFailed'));
  }
};

// 批量删除账号
const handleBatchDelete = async (accountsToDelete: Account[]) => {
  try {
    // 依次删除每个账号
    for (const account of accountsToDelete) {
      await httpApi.accounts.deleteAccount(account.id);
    }
    ElMessage.success(t('account.deleteSuccess'));
  } catch (error) {
    console.error('Failed to delete accounts:', error);
    ElMessage.error(t('account.deleteFailed'));
  }
};

// 重命名账号
const handleRename = async (account: Account, newName: string) => {
  try {
    await httpApi.accounts.updateAccount(account.id, { account_name: newName });
    ElMessage.success(t('account.renameSuccess'));
  } catch (error) {
    console.error('Failed to rename account:', error);
    ElMessage.error(t('account.renameFailed'));
  }
};

// 打开发送消息抽屉
const handleSendMessage = (account: Account) => {
  currentAccountId.value = account.id;
  sendMessageDrawerVisible.value = true;
};

// 消息发送成功
const handleMessageSent = (result: any) => {
  console.log('Message sent:', result);
};

// 创建账号
const handleCreateAccount = async () => {
  if (!newAccountName.value.trim()) {
    ElMessage.warning(t('account.enterName'));
    return;
  }

  try {
    await httpApi.accounts.createAccount({
      account_name: newAccountName.value.trim(),
      phone_number: '',
    });
    newAccountName.value = '';
    showCreateDialog.value = false;
    ElMessage.success(t('account.createSuccess'));
  } catch (error) {
    console.error('Failed to create account:', error);
    ElMessage.error(t('account.createFailed'));
  }
};

// 监听账号列表更新
let unsubscribeUpdate: (() => void) | null = null;

onMounted(() => {
  loadAccounts();

  // 监听账号列表更新
  if (env.isElectron) {
    unsubscribeUpdate = electronApi.whatsapp.onAccountsUpdate((data) => {
      accounts.value = data.map(mapAccount);
    });
  }
});

onUnmounted(() => {
  unsubscribeUpdate?.();
});
</script>

<style scoped>
.account-manager {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}
</style>
