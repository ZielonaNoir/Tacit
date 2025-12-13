<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchEvent, fetchEventPolls, fetchPollVotes, fetchPollVotesForEvent, fetchRSVPs, submitPollVote, lockPollDate, deleteEvent } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import ActivityFeed from '@/modules/feed/components/ActivityFeed.vue'
import GuestList from '../components/GuestList.vue'
import InviteShare from '../components/InviteShare.vue'
import type { TacitEvent, EventTimePoll, EventPollVote, RSVP } from '@/types/database'
import type { PollVoteStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'

const props = defineProps<{
  eventId?: string
}>()

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getIdentityPayload, getIdentityPayloadSafe } = useGuestIdentity()

const isHost = computed(() => {
  return event.value && user.value && event.value.creator_id === user.value.id
})

const event = ref<TacitEvent | null>(null)
const polls = ref<EventTimePoll[]>([])
const pollVotes = ref<Record<string, EventPollVote[]>>({})
const rsvps = ref<RSVP[]>([])
const loading = ref(true)

const themeStyle = computed(() => {
  const theme = event.value?.theme_config
  return {
    fontFamily: theme?.font || 'Inter',
    backgroundColor: theme?.bg_color || '#000000',
    color: theme?.primary_color || '#FF8A95'
  }
})


onMounted(async () => {
  const eventId = (props.eventId || route.params.id) as string
  try {
    // Parallel fetch event and polls first
    const [eventData, pollsData] = await Promise.all([
      fetchEvent(eventId),
      fetchEventPolls(eventId)
    ])
    
    event.value = eventData
    polls.value = pollsData
    
    // Then fetch votes (using poll IDs we just got) and RSVPs in parallel
    // Only fetch votes if there are polls
    const votePromise = pollsData.length > 0 
      ? fetchPollVotesForEvent(eventId, pollsData.map(p => p.id))
      : Promise.resolve({})
    
    const [votesData, rsvpsData] = await Promise.all([
      votePromise,
      fetchRSVPs(eventId)
    ])
    
    pollVotes.value = votesData
    rsvps.value = rsvpsData
  } catch (err) {
    console.error('Error fetching event data:', err)
    // Show error to user
    alert(`加载活动数据失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
})

const getVoteCounts = (pollId: string) => {
  const votes = pollVotes.value[pollId] || []
  return {
    yes: votes.filter(v => v.status === 'yes').length,
    ifNeedBe: votes.filter(v => v.status === 'if_need_be').length,
    no: votes.filter(v => v.status === 'no').length,
    total: votes.filter(v => v.status === 'yes' || v.status === 'if_need_be').length
  }
}

// Find most popular poll (highest yes + if_need_be votes)
const mostPopularPollId = computed(() => {
  let maxVotes = -1
  let popularId = ''
  
  for (const poll of polls.value) {
    const counts = getVoteCounts(poll.id)
    if (counts.total > maxVotes) {
      maxVotes = counts.total
      popularId = poll.id
    }
  }
  
  return popularId
})

const handleLockDate = async (pollId: string) => {
  if (!confirm('Lock this date? This will finalize the event time and notify all participants.')) return

  try {
    const poll = polls.value.find(p => p.id === pollId)
    if (!poll) return

    const eventId = (props.eventId || route.params.id) as string
    await lockPollDate(eventId, poll.start_time, poll.end_time)
    
    // Refresh event to get updated status
    event.value = await fetchEvent(eventId)
    
    // Create activity log
    const identity = await getIdentityPayloadSafe(user.value?.id)
    await supabase.from('activities').insert({
      event_id: eventId,
      ...identity,
      type: 'blast',
      content: `Event date locked: ${new Date(poll.start_time).toLocaleString()}`
    })

    handleUpdate()
  } catch (err) {
    console.error('Error locking date:', err)
    alert('Failed to lock date')
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return
  
  try {
    if (!event.value) return
    loading.value = true
    await deleteEvent(event.value.id)
    router.push('/')
  } catch (err) {
    console.error('Failed to delete event:', err)
    alert('Failed to delete event')
    loading.value = false
  }
}

const getUserVote = (pollId: string) => {
  const votes = pollVotes.value[pollId] || []
  const identity = getIdentityPayload(user.value?.id)
  
  if (identity.user_id) {
    return votes.find(v => v.user_id === identity.user_id)?.status
  } else {
    return votes.find(v => v.guest_id === identity.guest_id)?.status
  }
}

const handleVote = async (pollId: string, status: PollVoteStatus) => {
  try {
    // Ensure guest exists in DB before submitting vote
    const identity = await getIdentityPayloadSafe(user.value?.id)
    await submitPollVote(pollId, status, identity)
    
    // Refresh votes for this poll only (faster than refetching all)
    pollVotes.value[pollId] = await fetchPollVotes(pollId)
  } catch (err) {
    console.error('Error submitting vote:', err)
    alert('投票失败，请重试')
  }
}

const handleUpdate = async () => {
  // Refresh all data
  const eventId = route.params.id as string
  rsvps.value = await fetchRSVPs(eventId)
  event.value = await fetchEvent(eventId)
}

// Spotify URL 验证和转换
const isValidSpotifyUrl = (url: string): boolean => {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('spotify.com') && (
      urlObj.pathname.includes('/playlist/') ||
      urlObj.pathname.includes('/album/') ||
      urlObj.pathname.includes('/track/') ||
      urlObj.pathname.includes('/artist/')
    )
  } catch {
    return false
  }
}

const getSpotifyEmbedUrl = (url: string): string => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    // 将 open.spotify.com 转换为 embed URL
    if (urlObj.hostname === 'open.spotify.com') {
      return url.replace('open.spotify.com', 'open.spotify.com/embed')
    }
    // 处理其他可能的 Spotify URL 格式
    return url
  } catch {
    return url
  }
}
</script>

<template>
  <div v-if="loading" class="min-h-screen bg-black flex items-center justify-center text-white">
    <div class="animate-pulse font-mono tracking-widest">LOADING DATA STREAM...</div>
  </div>

  <div v-else-if="!event" class="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold text-xl uppercase tracking-widest">
    [ ERROR: EVENT NOT FOUND ]
  </div>

  <div
    v-else
    class="min-h-screen relative overflow-hidden transition-colors duration-500"
    :style="{ backgroundColor: themeStyle.backgroundColor, color: themeStyle.color, fontFamily: themeStyle.fontFamily }"
  >
    <!-- 动态背景特效 -->
    <div v-if="event.theme_config?.preset === 'neon-nights'" class="absolute inset-0 pointer-events-none mix-blend-screen opacity-30">
      <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-purple-500/20 to-transparent animate-pulse"></div>
    </div>
    <div v-if="event.theme_config?.preset === 'retro-paper'" class="absolute inset-0 pointer-events-none opacity-20 mix-blend-multiply"
         style="background-image: url('https://www.transparenttextures.com/patterns/cream-paper.png');"></div>
    <div v-if="event.theme_config?.preset === 'y2k-glitch'" class="absolute inset-0 pointer-events-none opacity-5"
         style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px);"></div>

    <!-- 顶部导航 -->
    <div class="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference text-white">
      <router-link to="/" class="font-bold uppercase tracking-widest text-xs hover:opacity-50 transition-opacity">
        ← TACIT HOME
      </router-link>
      <div class="flex items-center gap-4">
        <!-- Host Controls -->
        <div v-if="isHost" class="flex items-center gap-4 mr-4 border-r pr-6 border-white/20">
          <router-link
            :to="`/events/${event.id}/edit`"
            class="text-[10px] font-bold uppercase tracking-widest hover:opacity-100 opacity-60 transition-all hover:scale-105"
          >
            Edit Event
          </router-link>
          <button
            @click="handleDelete"
            class="text-[10px] font-bold uppercase tracking-widest hover:text-red-500 opacity-60 hover:opacity-100 transition-all hover:scale-105"
          >
            Delete
          </button>
        </div>

        <InviteShare
          :event-id="event.id"
          :event-title="event.title"
          :primary-color="themeStyle.color"
        />
        <div class="font-mono text-[10px] opacity-50">ID: {{ event.id.slice(0, 8) }}</div>
      </div>
    </div>

    <!-- 主容器 -->
    <div class="container mx-auto px-4 py-24 relative z-10">
      <div class="max-w-[90rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- 左侧：主要信息 (海报风格) -->
        <div class="lg:col-span-4 space-y-12">
          <!-- 标题区 -->
          <div class="relative border-l-8 pl-8 py-4" :style="{ borderColor: themeStyle.color }">
            <h1 class="text-6xl md:text-8xl font-black uppercase leading-[0.8] mb-6 tracking-tighter break-words">
              {{ event.title }}
            </h1>
            <p class="text-lg md:text-xl font-bold opacity-80 uppercase tracking-widest">
              {{ event.status === 'polling' ? '/// DATE PENDING' : '/// CONFIRMED' }}
            </p>
          </div>

          <!-- 描述 -->
          <div class="text-lg leading-relaxed font-medium opacity-90 border-t-2 pt-8" :style="{ borderColor: themeStyle.color + '40' }">
            {{ event.description }}
          </div>

          <!-- 详细信息网格 -->
          <div class="grid grid-cols-2 gap-8 font-mono text-sm uppercase tracking-wider">
            <div>
              <div class="opacity-50 text-[10px] mb-1">COORDINATES</div>
              <div class="font-bold text-lg">{{ event.location_name || 'TBD' }}</div>
              <div class="opacity-70 text-xs mt-1">{{ event.location_address }}</div>
            </div>
            <div>
              <div class="opacity-50 text-[10px] mb-1">TIMEFRAME</div>
              <div v-if="event.start_time" class="font-bold text-lg">
                {{ new Date(event.start_time).toLocaleDateString() }}
              </div>
              <div v-if="event.start_time" class="opacity-70 text-xs mt-1">
                {{ new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </div>
              <div v-else class="font-bold text-lg italic">VOTING IN PROGRESS</div>
            </div>
          </div>

          <!-- 模块区域 -->
          <div v-if="event.modules_config" class="space-y-8 pt-8">
            <!-- Spotify -->
            <div v-if="event.modules_config.spotify" class="border-4 p-1" :style="{ borderColor: themeStyle.color }">
              <div class="bg-black p-2 mb-1 text-white text-xs font-bold uppercase text-center flex items-center justify-center gap-2">
                <iconify-icon icon="mdi:spotify" class="text-lg"></iconify-icon>
                Sonic Landscape
              </div>
              <div v-if="event.modules_config.spotify.url && isValidSpotifyUrl(event.modules_config.spotify.url)" class="bg-black">
                <iframe
                  :src="getSpotifyEmbedUrl(event.modules_config.spotify.url)"
                  width="100%"
                  height="152"
                  frameborder="0"
                  allowtransparency="true"
                  allow="encrypted-media"
                  class="grayscale hover:grayscale-0 transition-all duration-500"
                ></iframe>
              </div>
              <div v-else class="bg-black p-8 text-center text-white/50">
                <div class="text-xs font-bold uppercase tracking-widest">[ ERROR: EVENT NOT FOUND ]</div>
                <div class="text-[10px] mt-2 opacity-70">请确保在创建活动时填写了有效的 Spotify 链接</div>
              </div>
            </div>

            <!-- Gift Registry -->
            <div v-if="event.modules_config.gift_registry?.items?.length" class="border-t-2 pt-4" :style="{ borderColor: themeStyle.color + '40' }">
              <h3 class="font-bold uppercase tracking-widest text-xs mb-4">Registry Protocol</h3>
              <ul class="space-y-2">
                <li v-for="(item, index) in event.modules_config.gift_registry.items" :key="index">
                  <a :href="item" target="_blank" class="block p-3 border border-current hover:bg-current hover:text-black transition-colors text-sm font-bold uppercase text-center">
                    Item 0{{ index + 1 }} →
                  </a>
                </li>
              </ul>
            </div>

            <!-- Dress Code -->
            <div v-if="event.modules_config.dress_code?.text" class="border-t-2 pt-4" :style="{ borderColor: themeStyle.color + '40' }">
              <h3 class="font-bold uppercase tracking-widest text-xs mb-2">
                <iconify-icon icon="game-icons:clothes" class="inline align-text-bottom mr-1"></iconify-icon>
                Dress Code
              </h3>
              <div class="text-sm font-medium opacity-90">{{ event.modules_config.dress_code.text }}</div>
            </div>

            <!-- Secret Address -->
            <div v-if="event.modules_config.secret_address && (isHost || rsvps.some(r => (r.user_id === user?.id || r.guest_id) && r.status === 'going'))">
              <div class="border-t-2 pt-4" :style="{ borderColor: themeStyle.color + '40' }">
                <div class="border-2 p-4 bg-yellow-500/10" :style="{ borderColor: themeStyle.color + '40' }">
                  <div class="font-bold uppercase text-xs mb-2 text-red-500">
                    <iconify-icon icon="mdi:eye-off" class="inline align-text-bottom mr-1"></iconify-icon>
                    Classified Location
                  </div>
                  <p class="font-mono text-sm">{{ event.modules_config.secret_address }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：互动区域 (投票 + Guest List) -->
        <div class="lg:col-span-4 space-y-8">
          <!-- Date Polling Section -->
          <div v-if="polls.length > 0 && event.status === 'polling'" class="border-4 p-6 relative bg-white/5 backdrop-blur-sm" :style="{ borderColor: themeStyle.color }">
            <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
              Select Protocol
            </div>
            
            <div class="space-y-4 mt-2">
              <div
                v-for="poll in polls"
                :key="poll.id"
                class="p-4 border-2 border-dashed transition-all hover:border-solid hover:bg-current/10 relative"
                :style="{ borderColor: themeStyle.color }"
                :class="{ 'ring-2 ring-green-500 ring-opacity-50': mostPopularPollId === poll.id && polls.length > 1 }"
              >
                <!-- Most Popular Badge -->
                <div v-if="mostPopularPollId === poll.id && polls.length > 1" class="absolute -top-2 -right-2 bg-green-500 text-black px-2 py-1 text-xs font-black uppercase">
                  Popular
                </div>
                
                <!-- Host Lock Button -->
                <div v-if="isHost" class="absolute top-2 right-2">
                  <button
                    @click="handleLockDate(poll.id)"
                    class="px-3 py-1 bg-coral-pink text-black text-xs font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    Lock
                  </button>
                </div>

                <div class="flex justify-between items-center mb-3">
                  <div class="font-mono text-sm font-bold">
                    {{ new Date(poll.start_time).toLocaleDateString() }}
                    <span class="opacity-60 block text-xs">{{ new Date(poll.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                  </div>
                  <div class="flex gap-1 text-[10px] font-black">
                    <span class="px-1 bg-green-500 text-black" v-if="getVoteCounts(poll.id).yes">{{ getVoteCounts(poll.id).yes }}</span>
                    <span class="px-1 bg-yellow-500 text-black" v-if="getVoteCounts(poll.id).ifNeedBe">{{ getVoteCounts(poll.id).ifNeedBe }}</span>
                  </div>
                </div>
                
                <div class="grid grid-cols-3 gap-2">
                  <button
                    @click="handleVote(poll.id, 'yes')"
                    class="py-2 text-xs font-bold uppercase border hover:bg-green-500 hover:text-black hover:border-green-500 transition-colors"
                    :class="getUserVote(poll.id) === 'yes' ? 'bg-green-500 text-black border-green-500' : 'border-current opacity-50 hover:opacity-100'"
                  >Yes</button>
                  <button
                    @click="handleVote(poll.id, 'if_need_be')"
                    class="py-2 text-xs font-bold uppercase border hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-colors"
                    :class="getUserVote(poll.id) === 'if_need_be' ? 'bg-yellow-500 text-black border-yellow-500' : 'border-current opacity-50 hover:opacity-100'"
                  >Maybe</button>
                  <button
                    @click="handleVote(poll.id, 'no')"
                    class="py-2 text-xs font-bold uppercase border hover:bg-red-500 hover:text-black hover:border-red-500 transition-colors"
                    :class="getUserVote(poll.id) === 'no' ? 'bg-red-500 text-black border-red-500' : 'border-current opacity-50 hover:opacity-100'"
                  >No</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Guest List -->
          <div>
            <h2 class="text-2xl font-black uppercase mb-6 tracking-tighter">Guest List</h2>
            <GuestList
              :event-id="event.id"
              :rsvps="rsvps"
              :is-host="!!isHost"
              :approval-required="event.approval_required || false"
              :primary-color="themeStyle.color"
              @update="handleUpdate"
            />
          </div>
        </div>

        <!-- 右侧：Live Feed (独立列，固定定位) -->
        <div class="lg:col-span-4 relative">
          <div class="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent;">
            <div class="border-t-4 border-b-4 py-6" :style="{ borderColor: themeStyle.color }">
              <h2 class="text-2xl font-black uppercase mb-6 tracking-tighter">Live Feed</h2>
              <ActivityFeed :event-id="event.id" :is-host="!!isHost" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

