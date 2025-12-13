<template>
  <div class="border-4 p-6 relative backdrop-blur-sm" :class="isLight ? 'bg-white/80' : 'bg-white/5'" :style="{ borderColor: primaryColor }">
    <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
      Notifications
    </div>

    <div class="space-y-4 mt-4">
      <!-- Header with unread count -->
      <div class="flex items-center justify-between">
        <div class="text-xs font-mono opacity-70">
          {{ unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!' }}
        </div>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllRead"
          :disabled="isMarkingAllRead"
          type="button"
          class="text-xs font-bold uppercase hover:opacity-100 opacity-60 transition-opacity disabled:opacity-50"
          :style="{ color: primaryColor }"
        >
          Mark All Read
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8 text-sm opacity-50">
        Loading notifications...
      </div>

      <!-- Empty State -->
      <div v-else-if="notifications.length === 0" class="text-center py-8 text-sm opacity-50 border-2 border-dashed p-6" :style="{ borderColor: primaryColor }">
        No notifications yet
      </div>

      <!-- Notifications List -->
      <div v-else class="space-y-2">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="p-4 border-2 relative transition-all hover:bg-white/5"
          :class="notification.read ? 'opacity-60' : 'bg-white/10'"
          :style="{ borderColor: primaryColor }"
        >
          <!-- Unread indicator -->
          <div v-if="!notification.read" class="absolute top-2 right-2 w-2 h-2 rounded-full" :style="{ backgroundColor: primaryColor }"></div>

          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Notification Icon -->
              <div class="flex items-center gap-2 mb-2">
                <iconify-icon 
                  :icon="getNotificationIcon(notification.type)" 
                  class="text-xl"
                  :style="{ color: primaryColor }"
                />
                <span class="text-xs font-bold uppercase opacity-70">{{ getNotificationTypeLabel(notification.type) }}</span>
              </div>

              <!-- Title -->
              <div class="font-bold text-sm mb-1">
                {{ notification.title }}
              </div>

              <!-- Message -->
              <div v-if="notification.message" class="text-xs opacity-70 mb-2">
                {{ notification.message }}
              </div>

              <!-- Event link -->
              <div v-if="notification.link" class="text-[10px] font-mono opacity-50">
                <a 
                  :href="notification.link" 
                  class="hover:opacity-100 transition-opacity"
                  :style="{ color: primaryColor }"
                >
                  View Event →
                </a>
              </div>

              <!-- Timestamp -->
              <div class="text-[10px] font-mono opacity-50 mt-2">
                {{ formatDate(notification.created_at) }}
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 shrink-0">
              <button
                v-if="!notification.read"
                @click="handleMarkRead(notification.id)"
                type="button"
                class="px-3 py-1 text-xs font-bold uppercase border-2 hover:opacity-100 opacity-60 transition-opacity"
                :style="{ borderColor: primaryColor }"
              >
                Mark Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchUserNotifications, markNotificationRead, markAllNotificationsRead } from '../services'
import { useAuth } from '@/composables/useAuth'
import type { Notification, NotificationType } from '@/types/database'
import { format } from 'date-fns'

defineProps<{
  primaryColor?: string
  isLight?: boolean
}>()

const emit = defineEmits<{
  updated: []
}>()

const { user } = useAuth()
const loading = ref(true)
const notifications = ref<Notification[]>([])
const isMarkingAllRead = ref(false)

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

const loadNotifications = async () => {
  if (!user.value) {
    loading.value = false
    return
  }

  loading.value = true
  try {
    notifications.value = await fetchUserNotifications(user.value.id, false)
  } catch (err) {
    console.error('Error loading notifications:', err)
    alert(`加载通知失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const handleMarkRead = async (notificationId: string) => {
  try {
    await markNotificationRead(notificationId)
    // Update local state
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      notification.read_at = new Date().toISOString()
    }
    emit('updated')
  } catch (err) {
    console.error('Error marking notification as read:', err)
    alert('标记已读失败')
  }
}

const handleMarkAllRead = async () => {
  if (!user.value || isMarkingAllRead.value) return

  isMarkingAllRead.value = true
  try {
    await markAllNotificationsRead(user.value.id)
    // Update local state
    notifications.value.forEach(n => {
      n.read = true
      n.read_at = new Date().toISOString()
    })
    emit('updated')
  } catch (err) {
    console.error('Error marking all notifications as read:', err)
    alert('标记全部已读失败')
  } finally {
    isMarkingAllRead.value = false
  }
}

const getNotificationIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    'poll_deadline_reminder': 'material-symbols:schedule',
    'invite_card_ready': 'material-symbols:card-giftcard',
    'poll_result': 'material-symbols:poll',
    'event_reminder': 'material-symbols:event'
  }
  return icons[type] || 'material-symbols:notifications'
}

const getNotificationTypeLabel = (type: NotificationType): string => {
  const labels: Record<NotificationType, string> = {
    'poll_deadline_reminder': 'Deadline',
    'invite_card_ready': 'Invite',
    'poll_result': 'Result',
    'event_reminder': 'Reminder'
  }
  return labels[type] || 'Notification'
}

const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
}

onMounted(() => {
  loadNotifications()
})

// Expose refresh method
defineExpose({
  refresh: loadNotifications
})
</script>
