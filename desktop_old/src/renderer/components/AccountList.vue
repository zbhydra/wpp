<template>
  <div class="account-list">
    <el-empty v-if="accounts.length === 0" :description="t('account.emptyState')" />

    <div v-else>
      <!-- 批量操作按钮 -->
      <div v-if="selectedAccounts.length > 0" class="batch-actions">
        <el-button type="danger" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          {{ t('account.batchDelete', { count: selectedAccounts.length }) }}
        </el-button>
        <el-button @click="clearSelection">
          {{ t('common.cancel') }}
        </el-button>
      </div>

      <el-table
        :data="accounts"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="name" :label="t('account.name')" width="200">
          <template #default="{ row }">
            <div class="account-name">{{ row.name }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="status" :label="t('account.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="phoneNumber" :label="t('account.phoneNumber')" width="150">
          <template #default="{ row }">
            <span v-if="row.phoneNumber">{{ row.phoneNumber }}</span>
            <span v-else class="text-placeholder">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="error" :label="t('account.errorMessage')">
          <template #default="{ row }">
            <span v-if="row.error" class="error-text">{{ row.error }}</span>
            <span v-else class="text-placeholder">-</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('account.actions')" width="280">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                v-if="row.status === 'stopped' || row.status === 'error'"
                type="success"
                size="small"
                @click="$emit('start', row)"
              >
                <el-icon><VideoPlay /></el-icon>
                {{ t('account.start') }}
              </el-button>
              <el-button
                v-if="row.status === 'starting' || row.status === 'qr' || row.status === 'ready'"
                type="warning"
                size="small"
                @click="$emit('stop', row)"
              >
                <el-icon><VideoPause /></el-icon>
                {{ t('account.stop') }}
              </el-button>
              <el-button
                v-if="row.status === 'ready'"
                type="info"
                size="small"
                @click="handleSendMessage(row)"
              >
                <el-icon><ChatDotRound /></el-icon>
                {{ t('account.sendMessage') }}
              </el-button>
              <el-button type="primary" size="small" @click="handleRename(row)">
                <el-icon><Edit /></el-icon>
                {{ t('account.rename') }}
              </el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon>
                {{ t('account.delete') }}
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 重命名对话框 -->
    <el-dialog v-model="showRenameDialog" :title="t('account.renameTitle')" width="400px">
      <el-form @submit.prevent="handleConfirmRename">
        <el-form-item :label="t('account.newName')">
          <el-input
            ref="renameInputRef"
            v-model="renameValue"
            :placeholder="t('account.newNamePlaceholder')"
            @keyup.enter="handleConfirmRename"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenameDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirmRename">{{ t('common.ok') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { VideoPlay, VideoPause, Edit, Delete, ChatDotRound } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import type { ElTable } from 'element-plus';
import { Account, AccountStatus } from '../../main/types';

const props = defineProps<{
  accounts: Account[];
}>();

const emit = defineEmits<{
  start: [account: Account];
  stop: [account: Account];
  delete: [account: Account];
  batchDelete: [accounts: Account[]];
  rename: [account: Account, newName: string];
  sendMessage: [account: Account];
}>();

const { t } = useI18n();

const showRenameDialog = ref(false);
const renameValue = ref('');
const renamingAccount = ref<Account | null>(null);
const renameInputRef = ref<HTMLInputElement | null>(null);
const selectedAccounts = ref<Account[]>([]);

const getStatusText = (status: AccountStatus): string => {
  const statusMap: Record<AccountStatus, string> = {
    [AccountStatus.Stopped]: t('account.statusStopped'),
    [AccountStatus.Starting]: t('account.statusStarting'),
    [AccountStatus.QR]: t('account.statusQrCode'),
    [AccountStatus.Ready]: t('account.statusConnected'),
    [AccountStatus.Error]: t('account.statusError'),
  };
  return statusMap[status] || status;
};

const getStatusType = (status: AccountStatus): any => {
  const typeMap: Record<AccountStatus, any> = {
    [AccountStatus.Stopped]: 'info',
    [AccountStatus.Starting]: 'primary',
    [AccountStatus.QR]: 'warning',
    [AccountStatus.Ready]: 'success',
    [AccountStatus.Error]: 'danger',
  };
  return typeMap[status] || 'info';
};

const handleSelectionChange = (selection: Account[]) => {
  selectedAccounts.value = selection;
};

const clearSelection = () => {
  selectedAccounts.value = [];
};

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      t('account.confirmBatchDelete', { count: selectedAccounts.value.length }),
      t('account.confirmDeleteTitle'),
      {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    emit('batchDelete', selectedAccounts.value);
    selectedAccounts.value = [];
  } catch {
    // 用户取消
  }
};

const handleRename = async (account: Account) => {
  renamingAccount.value = account;
  renameValue.value = account.name;
  showRenameDialog.value = true;
  await nextTick();
  renameInputRef.value?.focus();
  renameInputRef.value?.select();
};

const handleConfirmRename = () => {
  if (renamingAccount.value && renameValue.value.trim()) {
    emit('rename', renamingAccount.value, renameValue.value.trim());
    showRenameDialog.value = false;
  }
};

const handleDelete = async (account: Account) => {
  try {
    await ElMessageBox.confirm(
      t('account.confirmDelete', { name: account.name }),
      t('account.confirmDeleteTitle'),
      {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }
    );
    emit('delete', account);
  } catch {
    // 用户取消
  }
};

const handleSendMessage = (account: Account) => {
  emit('sendMessage', account);
};
</script>

<style scoped>
.account-list {
  min-height: 300px;
}

.batch-actions {
  margin-bottom: 16px;
  padding: 12px;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 4px;
  display: flex;
  gap: 12px;
}

.account-name {
  font-weight: 600;
  color: #2c3e50;
}

.text-placeholder {
  color: #c0c4cc;
}

.error-text {
  color: #f56c6c;
  font-size: 13px;
}
</style>
