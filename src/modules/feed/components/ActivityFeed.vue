<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { fetchActivities, createActivity } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import type { Activity } from '@/types/database'

const props = defineProps<{
  eventId: string
  isHost?: boolean
}>()

const { user, isAuthenticated } = useAuth()
const { getIdentityPayload, guestName } = useGuestIdentity()

const activities = ref<Activity[]>([])
const loading = ref(true)
const newComment = ref('')
const showPhotoUpload = ref(false)

onMounted(async () => {
  await loadActivities()
  
  // Subscribe to real-time updates
  const channel = supabase
    .channel(`activities:${props.eventId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'activities',
      filter: `event_id=eq.${props.eventId}`
    }, () => {
      loadActivities()
    })
    .subscribe()

  // Cleanup on unmount would be nice, but Vue 3 Composition API handles it
})

const loadActivities = async () => {
  try {
    activities.value = await fetchActivities(props.eventId)
  } catch (err) {
    console.error('Error loading activities:', err)
  } finally {
    loading.value = false
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) return

  try {
    const identity = getIdentityPayload(user.value?.id)
    await createActivity(
      props.eventId,
      'comment',
      newComment.value,
      null,
      identity
    )
    newComment.value = ''
    await loadActivities()
  } catch (err) {
    console.error('Error posting comment:', err)
    alert('发布评论失败，请重试')
  }
}

const submitBlast = async (content: string) => {
  if (!content.trim()) return

  try {
    const identity = getIdentityPayload(user.value?.id)
    await createActivity(
      props.eventId,
      'blast',
      content,
      null,
      identity
    )
    await loadActivities()
  } catch (err) {
    console.error('Error posting blast:', err)
    alert('发布广播失败，请重试')
  }
}

const getActivityAuthor = (activity: Activity) => {
  if (activity.user_id) {
    return 'User'
  } else if (activity.guest_id) {
    return activity.content?.split(' ')[0] || 'Guest'
  }
  return 'Anonymous'
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Blast Form (Host Only) -->
    <div v-if="isHost" class="bg-coral-pink border-4 border-black p-6">
      <h3 class="font-black text-xl mb-4 uppercase tracking-wider">Text Blast</h3>
      <div class="flex gap-4">
        <input
          v-model="newComment"
          @keyup.enter="submitBlast(newComment)"
          type="text"
          class="flex-1 px-4 py-3 border-4 border-black bg-white text-black font-bold focus:outline-none"
          placeholder="发送广播消息..."
        />
        <button
          @click="submitBlast(newComment); newComment = ''"
          class="px-6 py-3 bg-black text-white font-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
        >
          Blast
        </button>
      </div>
    </div>

    <!-- Activities List -->
    <div class="space-y-4">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="border-4 border-black bg-white p-6"
        :class="{
          'bg-yellow-100 border-coral-pink': activity.type === 'blast',
          'bg-blue-50': activity.type === 'rsvp_log'
        }"
      >
        <!-- Blast -->
        <div v-if="activity.type === 'blast'" class="flex items-start gap-4">
          <div class="w-12 h-12 bg-coral-pink rounded-full flex items-center justify-center text-black font-black text-xl">
            📢
          </div>
          <div class="flex-1">
            <div class="font-black text-lg mb-2 uppercase tracking-wider">Host Blast</div>
            <p class="text-lg font-bold">{{ activity.content }}</p>
            <p class="text-sm text-gray-600 mt-2">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>

        <!-- RSVP Log -->
        <div v-else-if="activity.type === 'rsvp_log'" class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-black text-xl">
            ✓
          </div>
          <div class="flex-1">
            <p class="text-lg font-bold">{{ activity.content }}</p>
            <p class="text-sm text-gray-600">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>

        <!-- Comment -->
        <div v-else-if="activity.type === 'comment'" class="flex items-start gap-4">
          <div class="w-12 h-12 bg-brand-purple rounded-full flex items-center justify-center text-white font-bold">
            {{ getActivityAuthor(activity)[0].toUpperCase() }}
          </div>
          <div class="flex-1">
            <div class="font-bold mb-2">{{ getActivityAuthor(activity) }}</div>
            <p class="text-base">{{ activity.content }}</p>
            <p class="text-sm text-gray-600 mt-2">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>

        <!-- Photo -->
        <div v-else-if="activity.type === 'photo'" class="flex items-start gap-4">
          <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            📷
          </div>
          <div class="flex-1">
            <div class="font-bold mb-2">{{ getActivityAuthor(activity) }}</div>
            <img
              v-if="activity.media_url"
              :src="activity.media_url"
              alt="Photo"
              class="max-w-full h-auto rounded border-4 border-black mt-2"
            />
            <p v-if="activity.content" class="text-base mt-2">{{ activity.content }}</p>
            <p class="text-sm text-gray-600 mt-2">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>
      </div>

      <div v-if="activities.length === 0 && !loading" class="text-center py-12 text-gray-500">
        <p>还没有动态</p>
      </div>
    </div>

    <!-- Comment Form -->
    <div class="border-4 border-black bg-white p-6">
      <h3 class="font-black text-xl mb-4 uppercase tracking-wider">Add Comment</h3>
      <div class="flex gap-4">
        <input
          v-model="newComment"
          @keyup.enter="submitComment"
          type="text"
          class="flex-1 px-4 py-3 border-4 border-black bg-white text-black font-bold focus:outline-none focus:border-coral-pink"
          placeholder="写下你的评论..."
        />
        <button
          @click="submitComment"
          class="px-6 py-3 bg-black text-white font-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
        >
          Post
        </button>
      </div>
    </div>
  </div>
</template>

