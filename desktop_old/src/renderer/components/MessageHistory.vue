<template>
  <div class="message-history">
    <div class="history-header">
      <span>发送历史</span>
      <el-button v-if="history.length > 0" link type="danger" @click="handleClearAll">
        清空
      </el-button>
    </div>

    <el-scrollbar height="300px">
      <div v-if="history.length === 0" class="empty-state">
        <el-empty description="暂无发送记录" :image-size="60" />
      </div>

      <div v-else class="history-list">
        <div
          v-for="record in history"
          :key="record.id"
          class="history-item"
          :class="{ failed: !record.success }"
        >
          <div class="item-header">
            <span class="time">{{ formatTime(record.timestamp) }}</span>
            <span class="to">→ {{ record.to }}</span>
            <el-button link type="danger" size="small" @click="handleDelete(record.id)">
              删除
            </el-button>
          </div>
          <div class="item-message">{{ record.message }}</div>
          <div v-if="!record.success" class="item-error">{{ record.error }}</div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { httpApi } from '@/api';
import type { MessageRecord } from '@/shared/storage-interface';

const props = defineProps<{
  accountId: string;
}>();

const emit = defineEmits<{
  resend: [record: MessageRecord];
}>();

const history = ref<MessageRecord[]>([]);

// 映射后端字段到前端格式
const mapMessage = (whatsapp_message: any): MessageRecord => ({
  id: whatsapp_message.id.toString(),
  accountId: whatsapp_message.whatsapp_account_id.toString(),
  operatorId: whatsapp_message.operator_id,
  to: whatsapp_message.to_phone,
  message: whatsapp_message.message_content,
  timestamp: whatsapp_message.sent_at || whatsapp_message.created_at,
  success: whatsapp_message.status === 3,
  error: whatsapp_message.error_message,
});

// 加载历史记录
const loadHistory = async () => {
  try {
    const messages = await httpApi.messages.getMessageHistory(props.accountId);
    history.value = messages.map(mapMessage);
  } catch (error) {
    console.error('Failed to load message history:', error);
  }
};

// 删除记录
const handleDelete = async (recordId: string) => {
  try {
    await ElMessageBox.confirm('确定删除这条记录吗？', '提示', {
      type: 'warning',
    });
    await httpApi.messages.deleteMessage(props.accountId, recordId);
    await loadHistory();
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete message:', error);
      ElMessage.error('删除失败');
    }
  }
};

// 清空所有记录
const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有发送记录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await httpApi.messages.clearMessageHistory(props.accountId);
    history.value = [];
    ElMessage.success('已清空');
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to clear history:', error);
      ElMessage.error('操作失败');
    }
  }
};

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 暴露刷新方法
defineExpose({
  refresh: loadHistory,
});

onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.message-history {
  border-top: 1px solid var(--el-border-color);
  padding-top: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
}

.empty-state {
  padding: 20px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-fill-color-blank);
}

.history-item.failed {
  border-color: var(--el-color-danger);
  background-color: var(--el-color-danger-light-9);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.time {
  flex-shrink: 0;
}

.to {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-message {
  margin-top: 8px;
  color: var(--el-text-color-primary);
  word-break: break-all;
  line-height: 1.5;
}

.item-error {
  margin-top: 6px;
  color: var(--el-color-danger);
  font-size: 12px;
}
</style>
