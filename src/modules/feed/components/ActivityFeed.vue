<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { fetchActivities, createActivity } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import type { Activity } from '@/types/database'
import type { GuestIdentity } from '@/types/database'

const props = defineProps<{
  eventId: string
  isHost?: boolean
}>()

const { user, isAuthenticated } = useAuth()
const { getIdentityPayloadSafe, guestName, updateGuestProfile, ensureGuestExists } = useGuestIdentity()

const activities = ref<Activity[]>([])
const guestIdentities = ref<Record<string, GuestIdentity>>({}) // Map of guest_id -> GuestIdentity
const loading = ref(true)
const newComment = ref('')
const guestNameInput = ref('')
const showGuestNameInput = ref(false)

// Check if anonymous user needs to set name
const needsGuestName = computed(() => {
  return !isAuthenticated.value && !guestName.value
})

onMounted(async () => {
  await loadActivities()
  
  // Subscribe to real-time updates
  supabase
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
})

const loadActivities = async () => {
  try {
    activities.value = await fetchActivities(props.eventId)
    
    // Fetch guest identities for all guest_ids in activities
    const guestIds = [...new Set(activities.value
      .filter(a => a.guest_id)
      .map(a => a.guest_id!)
    )]
    
    if (guestIds.length > 0) {
      const { data: guests, error } = await supabase
        .from('guest_identities')
        .select('*')
        .in('id', guestIds)
      
      if (!error && guests) {
        const guestMap: Record<string, GuestIdentity> = {}
        for (const guest of guests) {
          guestMap[guest.id] = guest
        }
        guestIdentities.value = guestMap
      }
    }
  } catch (err) {
    console.error('Error loading activities:', err)
  } finally {
    loading.value = false
  }
}

const handleSetGuestName = async () => {
  if (!guestNameInput.value.trim()) return
  await updateGuestProfile(guestNameInput.value.trim())
  await ensureGuestExists()
  guestNameInput.value = ''
  showGuestNameInput.value = false
}

const submitComment = async () => {
  if (!newComment.value.trim()) return

  // Check if anonymous user needs to set name
  if (!user.value && !guestName.value) {
    showGuestNameInput.value = true
    return
  }

  try {
    // Ensure guest exists in DB before posting comment
    const identity = await getIdentityPayloadSafe(user.value?.id)
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
    // Ensure guest exists in DB before posting blast
    const identity = await getIdentityPayloadSafe(user.value?.id)
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
    // Get display_name from guest_identities
    const guest = guestIdentities.value[activity.guest_id]
    return guest?.display_name || 'Guest'
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
  <div class="flex flex-col h-full min-h-0">
    <!-- Fixed Top Section: Host Command & New Transmission -->
    <div class="sticky top-0 z-10 space-y-4 pb-4 border-b-4" style="background: inherit; backdrop-filter: blur(8px); border-color: currentColor;">
      <!-- Blast Form (Host Only) -->
      <div v-if="isHost" class="bg-coral-pink border-4 border-black p-6 relative">
        <div class="absolute -top-3 left-4 bg-black text-white px-2 text-xs font-bold uppercase tracking-widest">Host Command</div>
        <div class="flex gap-4 mt-2">
          <input
            v-model="newComment"
            @keyup.enter="submitBlast(newComment)"
            type="text"
            class="flex-1 px-4 py-3 border-4 border-black bg-white text-black font-bold focus:outline-none placeholder-gray-500 uppercase"
            placeholder="SEND BLAST MESSAGE..."
          />
          <button
            @click="submitBlast(newComment); newComment = ''"
            class="px-6 py-3 bg-black text-white font-black border-4 border-black shadow-[4px_4px_0_0_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
          >
            Blast
          </button>
        </div>
      </div>

      <!-- Guest Name Input (Anonymous Users) -->
      <div v-if="needsGuestName || showGuestNameInput" class="bg-yellow-300 border-4 border-black p-4 relative">
        <div class="absolute -top-3 left-4 bg-black text-white px-2 text-xs font-bold uppercase tracking-widest">IDENTIFY REQUIRED</div>
        <div class="flex gap-4 mt-2">
          <input
            v-model="guestNameInput"
            @keyup.enter="handleSetGuestName"
            type="text"
            class="flex-1 px-4 py-3 border-4 border-black bg-white text-black font-bold focus:outline-none placeholder-gray-500 uppercase"
            placeholder="ENTER YOUR NAME TO SEND MESSAGES..."
          />
          <button
            @click="handleSetGuestName"
            class="px-6 py-3 bg-black text-white font-black border-4 border-black shadow-[4px_4px_0_0_#fff] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
          >
            Set
          </button>
        </div>
      </div>

      <!-- Comment Form -->
      <div class="border-4 border-black bg-white p-4 flex gap-4 items-center relative">
        <div class="absolute -top-3 left-4 bg-black text-white px-2 text-xs font-bold uppercase tracking-widest">New Transmission</div>
        <input
          v-model="newComment"
          @keyup.enter="submitComment"
          type="text"
          class="flex-1 bg-transparent border-none focus:ring-0 font-mono text-sm placeholder-gray-400"
          placeholder="Type your message..."
          :disabled="needsGuestName"
        />
        <button
          @click="submitComment"
          class="px-4 py-2 bg-black text-white font-bold text-xs uppercase hover:bg-coral-pink hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="needsGuestName"
        >
          Send
        </button>
      </div>
    </div>

    <!-- Scrollable Activities List -->
    <div class="flex-1 overflow-y-auto space-y-4 pt-4">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="border-4 border-black bg-white p-6 relative group hover:translate-x-1 hover:translate-y-1 transition-transform"
        :class="{
          'bg-yellow-300 border-black': activity.type === 'blast',
          'bg-white': activity.type !== 'blast'
        }"
      >
        <!-- Blast -->
        <div v-if="activity.type === 'blast'" class="flex items-start gap-4">
          <div class="w-12 h-12 bg-black text-yellow-300 border-2 border-black rounded-full flex items-center justify-center font-black text-xl">
            !
          </div>
          <div class="flex-1">
            <div class="font-black text-xs mb-1 uppercase tracking-wider opacity-60">System Broadcast</div>
            <p class="text-lg font-bold font-mono uppercase leading-tight">{{ activity.content }}</p>
            <p class="text-[10px] font-mono mt-2 opacity-60">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>

        <!-- RSVP Log -->
        <div v-else-if="activity.type === 'rsvp_log'" class="flex items-center gap-4 opacity-70">
          <div class="w-8 h-8 bg-green-500 border-2 border-black rounded-full flex items-center justify-center text-black font-black text-sm">
            ✓
          </div>
          <div class="flex-1 flex justify-between items-center">
            <p class="text-sm font-bold font-mono uppercase">{{ activity.content }}</p>
            <p class="text-[10px] font-mono opacity-60">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>

        <!-- Comment -->
        <div v-else-if="activity.type === 'comment'" class="flex items-start gap-4">
          <div class="w-10 h-10 bg-black text-white border-2 border-black rounded-none flex items-center justify-center font-bold">
            {{ getActivityAuthor(activity)[0].toUpperCase() }}
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-baseline mb-1">
              <div class="font-bold uppercase text-xs tracking-wider">
                <!-- Show guest display_name if available -->
                <span v-if="activity.guest_id && guestIdentities[activity.guest_id]">
                  {{ guestIdentities[activity.guest_id].display_name }}
                </span>
                <span v-else-if="activity.user_id">
                  User
                </span>
                <span v-else>
                  {{ getActivityAuthor(activity) }}
                </span>
              </div>
              <div class="text-[10px] font-mono opacity-50">{{ formatTime(activity.created_at) }}</div>
            </div>
            <p class="text-base font-medium leading-snug border-l-4 border-black pl-3 py-1">{{ activity.content }}</p>
          </div>
        </div>

        <!-- Photo -->
        <div v-else-if="activity.type === 'photo'" class="flex items-start gap-4">
          <div class="w-10 h-10 bg-blue-500 border-2 border-black flex items-center justify-center text-white font-bold">
            P
          </div>
          <div class="flex-1">
            <div class="font-bold uppercase text-xs mb-2">{{ getActivityAuthor(activity) }} uploaded:</div>
            <div class="border-4 border-black p-1 bg-white inline-block rotate-1 hover:rotate-0 transition-transform">
              <img
                v-if="activity.media_url"
                :src="activity.media_url"
                alt="Photo"
                class="max-w-[200px] h-auto grayscale hover:grayscale-0 transition-all"
              />
            </div>
            <p v-if="activity.content" class="text-sm mt-2 font-mono">{{ activity.content }}</p>
            <p class="text-[10px] font-mono mt-1 opacity-50">{{ formatTime(activity.created_at) }}</p>
          </div>
        </div>
      </div>

      <div v-if="activities.length === 0 && !loading" class="text-center py-12 border-2 border-dashed border-current opacity-50 font-mono text-xs uppercase tracking-widest">
        No Signal Detected
      </div>
    </div>
  </div>
</template>

