<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchEvent, fetchEventPolls, fetchPollVotes, fetchPollVotesForEvent, fetchRSVPs, submitPollVote, lockPollDate, deleteEvent } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import ActivityFeed from '@/modules/feed/components/ActivityFeed.vue'
import GuestList from '../components/GuestList.vue'
import InviteShare from '../components/InviteShare.vue'
import type { TacitEvent, EventTimePoll, EventPollVote, RSVP, UserAvailability, FreeTimeWindow } from '@/types/database'
import type { PollVoteStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import AvailabilityPicker from '@/modules/polling/components/AvailabilityPicker.vue'
import FreeTimeWindows from '@/modules/polling/components/FreeTimeWindows.vue'
import AvailabilityManager from '@/modules/polling/components/AvailabilityManager.vue'
import { fetchEventAvailabilities, calculateFreeTimeWindows } from '@/modules/polling/services'
import { loadFont } from '@/lib/fonts'
import { availableFonts } from '@/lib/fonts'

const props = defineProps<{
  eventId?: string
}>()

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { getIdentityPayload, getIdentityPayloadSafe, guestId } = useGuestIdentity()

const isHost = computed(() => {
  return event.value && user.value && event.value.creator_id === user.value.id
})

const event = ref<TacitEvent | null>(null)
const polls = ref<EventTimePoll[]>([])
const pollVotes = ref<Record<string, EventPollVote[]>>({})
const rsvps = ref<RSVP[]>([])
const loading = ref(true)
const accessError = ref<string | null>(null)
const showAvailabilityPicker = ref(false)
const showAvailabilityManager = ref(false)
const availabilities = ref<UserAvailability[]>([])
const freeTimeWindows = ref<FreeTimeWindow[]>([])
const calculatingWindows = ref(false)
const availabilityManagerRef = ref<InstanceType<typeof AvailabilityManager> | null>(null)

const themeStyle = computed(() => {
  const theme = event.value?.theme_config
  const bgColor = theme?.bg_color || '#000000'
  const primaryColor = theme?.primary_color || '#FF8A95'
  
  // Simple brightness check
  const getBrightness = (hex: string) => {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b)

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return 0
    
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    
    return (r * 299 + g * 587 + b * 114) / 1000
  }

  const isLightBg = getBrightness(bgColor) > 180 // Threshold for light background

  return {
    fontFamily: theme?.font || 'Inter',
    backgroundColor: bgColor,
    // If background is light, use black for text, otherwise use primary color or white
    color: isLightBg ? '#000000' : primaryColor,
    // Keep primary color for accents/borders
    borderColor: primaryColor,
    isLight: isLightBg
  }
})


// Theme effects
const initThemeEffects = () => {
  console.log('[EventDetail] Init theme effects called', event.value?.theme_config)
  if (!event.value?.theme_config) {
    // Hide containers if no theme config
    const confettiContainer = document.getElementById('confetti-container')
    const emojiContainer = document.getElementById('emoji-container')
    if (confettiContainer) confettiContainer.style.display = 'none'
    if (emojiContainer) emojiContainer.style.display = 'none'
    return
  }

  const effects = event.value.theme_config.effects || []
  console.log('[EventDetail] Effects to init:', effects, 'Type:', typeof effects, 'Is Array:', Array.isArray(effects))
  
  // Load font dynamically
  if (event.value.theme_config.font) {
    const font = availableFonts.find(f => f.name === event.value?.theme_config?.font)
    if (font) {
      loadFont(font).catch(err => console.warn('Failed to load font:', err))
    }
  }

  // Initialize confetti effect
  if (Array.isArray(effects) && effects.includes('confetti')) {
    console.log('[EventDetail] Initializing confetti...')
    initConfetti()
  } else {
    const confettiContainer = document.getElementById('confetti-container')
    if (confettiContainer) {
      confettiContainer.style.display = 'none'
      confettiContainer.innerHTML = ''
    }
  }

  // Initialize emoji falling effect
  if (Array.isArray(effects) && effects.includes('emoji')) {
    console.log('[EventDetail] Initializing emoji falling...')
    initEmojiFalling()
  } else {
    const emojiContainer = document.getElementById('emoji-container')
    if (emojiContainer) {
      emojiContainer.style.display = 'none'
      emojiContainer.innerHTML = ''
    }
  }
}

const initConfetti = () => {
  const container = document.getElementById('confetti-container')
  if (!container) {
    console.warn('[EventDetail] Confetti container not found')
    return
  }
  console.log('[EventDetail] Confetti container found, creating elements')

  const colors = ['#FF8A95', '#00FFFF', '#FF4D00', '#00FF00', '#FFD700', '#FFFFFF']
  const confettiCount = 100 // Increased count

  // Clear existing confetti
  container.innerHTML = ''
  container.style.display = 'block' // Show container

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div')
    confetti.style.position = 'absolute'
    confetti.style.width = `${Math.random() * 10 + 8}px` // Increased size
    confetti.style.height = `${Math.random() * 10 + 8}px` // Increased size
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    confetti.style.left = `${Math.random() * 100}%`
    confetti.style.top = `${Math.random() * -20}%` // Random start height above viewport
    confetti.style.opacity = '0.8'
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`
    confetti.style.animation = `confetti-fall ${Math.random() * 3 + 3}s linear infinite` // Slower fall
    confetti.style.animationDelay = `${Math.random() * 5}s`
    confetti.style.pointerEvents = 'none'
    container.appendChild(confetti)
  }
}

const initEmojiFalling = () => {
  const container = document.getElementById('emoji-container')
  if (!container) {
    console.warn('[EventDetail] Emoji container not found')
    return
  }
  console.log('[EventDetail] Emoji container found, creating elements')

  const emojis = ['🎉', '✨', '🎊', '🌟', '💫', '⭐', '🎈', '🎁', '🎀', '💖']
  const emojiCount = 40 // Increased count

  // Clear existing emojis
  container.innerHTML = ''
  container.style.display = 'block' // Show container

  for (let i = 0; i < emojiCount; i++) {
    const emoji = document.createElement('div')
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)]
    emoji.style.position = 'absolute'
    emoji.style.fontSize = `${Math.random() * 20 + 25}px` // Increased size
    emoji.style.left = `${Math.random() * 100}%`
    emoji.style.top = `${Math.random() * -20}%` // Random start height above viewport
    emoji.style.opacity = '0.7'
    const randomX = (Math.random() - 0.5) * 2
    emoji.style.setProperty('--random-x', String(randomX))
    emoji.style.animation = `emoji-fall ${Math.random() * 5 + 4}s linear infinite` // Slower fall
    emoji.style.animationDelay = `${Math.random() * 5}s`
    emoji.style.pointerEvents = 'none'
    container.appendChild(emoji)
  }
}

onMounted(async () => {
  const eventId = (props.eventId || route.params.id) as string
  try {
    // Check for invite code in query params (from invite card page)
    const inviteCodeFromQuery = route.query.invite as string | undefined
    const inviteCodeFromParams = route.params.code as string | undefined
    const inviteCode = inviteCodeFromQuery || inviteCodeFromParams
    
    // Try to fetch event - use invite code if available to bypass RLS for private events
    let eventData: TacitEvent
    let pollsData: EventTimePoll[]
    
    try {
      // Try fetching with invite code first (if available)
      if (inviteCode) {
        eventData = await fetchEvent(eventId, inviteCode)
      } else {
        eventData = await fetchEvent(eventId)
      }
      
      // Fetch polls (this should work for both public and private events)
      pollsData = await fetchEventPolls(eventId)
    } catch (fetchError: any) {
      // If fetch fails, it might be a private event without invite code
      // Check if user has an invite card in database
      if (fetchError.code === 'PGRST116' || fetchError.message?.includes('0 rows')) {
        let hasInvite = false
        let foundInviteCode: string | null = null
        
        // Check for logged-in user
        if (user.value) {
          const { data: userInvites } = await supabase
            .from('invite_cards')
            .select('invite_code')
            .eq('event_id', eventId)
            .eq('user_id', user.value.id)
            .limit(1)
          
          if (userInvites && userInvites.length > 0) {
            hasInvite = true
            foundInviteCode = userInvites[0].invite_code
          }
        }
        
        // Check for guest user
        if (!hasInvite && guestId.value) {
          const { data: guestInvites } = await supabase
            .from('invite_cards')
            .select('invite_code')
            .eq('event_id', eventId)
            .eq('guest_id', guestId.value)
            .limit(1)
          
          if (guestInvites && guestInvites.length > 0) {
            hasInvite = true
            foundInviteCode = guestInvites[0].invite_code
          }
        }
        
        if (hasInvite && foundInviteCode) {
          // User has invite card, use it to fetch event
          eventData = await fetchEvent(eventId, foundInviteCode)
          pollsData = await fetchEventPolls(eventId)
        } else {
          // No access - show error
          accessError.value = 'This is a private event. You need an invitation to access it.'
          loading.value = false
          return
        }
      } else {
        throw fetchError
      }
    }
    
    // Check if user is creator (for additional access checks)
    const isCreator = user.value && eventData.creator_id === user.value.id
    
    // Additional validation for private events
    if (eventData.is_public === false && !isCreator) {
      // If we got here, we either have an invite code or found one in database
      // This is already handled above, so we can continue
    }
    
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
    
    // Load availabilities and calculate free time windows for polling events
    if (eventData.status === 'polling') {
      await refreshFreeTimeWindows()
    }

    // Initialize theme effects after event is loaded and DOM is ready
    await nextTick()
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initThemeEffects()
      })
    })
  } catch (err) {
    console.error('Error fetching event data:', err)
    // Show error to user
    alert(`加载活动数据失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
})

// Watch for theme config changes
watch(() => event.value?.theme_config, async () => {
  if (event.value) {
    await nextTick()
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initThemeEffects()
      })
    })
  }
}, { deep: true })

const refreshFreeTimeWindows = async () => {
  if (!event.value) return
  
  calculatingWindows.value = true
  try {
    availabilities.value = await fetchEventAvailabilities(event.value.id)
    
    // 只考虑有有效 RSVP（going/maybe）的参与者
    const validRSVPs = rsvps.value
      .filter(rsvp => rsvp.status === 'going' || rsvp.status === 'maybe')
      .map(rsvp => ({
        user_id: rsvp.user_id,
        guest_id: rsvp.guest_id
      }))
    
    freeTimeWindows.value = calculateFreeTimeWindows(availabilities.value, validRSVPs)
  } catch (err) {
    console.error('Error calculating free time windows:', err)
  } finally {
    calculatingWindows.value = false
  }
}

const handleAvailabilitySubmitted = async () => {
  showAvailabilityPicker.value = false
  await refreshFreeTimeWindows()
  // Refresh availability manager if visible
  if (availabilityManagerRef.value) {
    availabilityManagerRef.value.refresh()
  }
}

const handleAvailabilityUpdated = async () => {
  await refreshFreeTimeWindows()
}

const handleCreatePollFromWindow = async (window: FreeTimeWindow) => {
  if (!event.value) return
  
  try {
    // Create a new poll entry for this time window
    const { error } = await supabase
      .from('event_time_polls')
      .insert({
        event_id: event.value.id,
        start_time: window.start,
        end_time: window.end
      })
    
    if (error) throw error
    
    // Refresh polls
    polls.value = await fetchEventPolls(event.value.id)
    alert('时间选项已创建！')
  } catch (err) {
    console.error('Error creating poll:', err)
    alert(`创建失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

const handleLockTimeWindow = async (window: FreeTimeWindow) => {
  if (!event.value) return
  
  if (confirm('确定要锁定这个时间并设置为活动时间吗？')) {
    try {
      // Update event with locked time
      const { error } = await supabase
        .from('events')
        .update({
          start_time: window.start,
          end_time: window.end,
          status: 'scheduled'
        })
        .eq('id', event.value.id)
      
      if (error) throw error
      
      // Refresh event data
      await handleUpdate()
      alert('活动时间已锁定！')
    } catch (err) {
      console.error('Error locking time:', err)
      alert(`锁定失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }
}

const getVoteCounts = (pollId: string) => {
  const votes = pollVotes.value[pollId] || []
  return {
    yes: votes.filter(v => v.status === 'yes').length,
    ifNeedBe: votes.filter(v => v.status === 'if_need_be').length,
    no: votes.filter(v => v.status === 'no').length,
    total: votes.filter(v => v.status === 'yes' || v.status === 'if_need_be').length
  }
}

// Find most popular poll using weighted scoring
// "yes" = 3 points, "if_need_be" = 1 point, "no" = 0 points
const mostPopularPollId = computed(() => {
  if (polls.value.length === 0) return ''
  
  let maxScore = -1
  let popularId = ''

  for (const poll of polls.value) {
    const counts = getVoteCounts(poll.id)
    // Weighted score: yes votes are worth more
    const score = counts.yes * 3 + counts.ifNeedBe * 1
    
    if (score > maxScore) {
      maxScore = score
      popularId = poll.id
    } else if (score === maxScore && score > 0) {
      // If tied, prefer the one with more "yes" votes
      const currentCounts = getVoteCounts(popularId)
      if (counts.yes > currentCounts.yes) {
        popularId = poll.id
      }
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
  
  // Refresh availabilities and free time windows if needed
  if (event.value?.status === 'polling') {
    await refreshFreeTimeWindows()
  }
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

  <div v-else-if="accessError" class="min-h-screen bg-black flex items-center justify-center text-white">
    <div class="text-center max-w-md p-8 border-4 border-red-500">
      <h1 class="text-2xl font-black mb-4 uppercase tracking-wider text-red-500">Access Denied</h1>
      <p class="mb-6">{{ accessError }}</p>
      <button
        @click="router.push('/')"
        class="px-6 py-3 border-4 border-white bg-white text-black font-bold uppercase hover:opacity-80 transition-opacity"
      >
        Go Home
      </button>
    </div>
  </div>

  <div v-else-if="!event" class="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold text-xl uppercase tracking-widest">
    [ ERROR: EVENT NOT FOUND ]
  </div>

  <div
    v-else
    class="min-h-screen relative overflow-hidden transition-colors duration-500"
    :style="{ backgroundColor: themeStyle.backgroundColor, color: themeStyle.color, fontFamily: themeStyle.fontFamily }"
  >
    <!-- Confetti Effect Container (always present, content added dynamically) -->
    <div id="confetti-container" class="fixed inset-0 pointer-events-none z-[100]" style="display: none;"></div>
    
    <!-- Emoji Falling Effect Container (always present, content added dynamically) -->
    <div id="emoji-container" class="fixed inset-0 pointer-events-none z-[100]" style="display: none;"></div>
    
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
          :event="event"
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
          <!-- Availability Picker (for participants) -->
          <div v-if="event.status === 'polling' && showAvailabilityPicker">
            <AvailabilityPicker
              :event-id="event.id"
              :primary-color="themeStyle.color"
              @submitted="handleAvailabilitySubmitted"
              @cancel="showAvailabilityPicker = false"
            />
          </div>

          <!-- Free Time Windows (for host) -->
          <div v-if="event.status === 'polling' && isHost && !showAvailabilityPicker && !showAvailabilityManager">
            <FreeTimeWindows
              :windows="freeTimeWindows"
              :loading="calculatingWindows"
              :is-host="!!isHost"
              :primary-color="themeStyle.color"
              @create-poll="handleCreatePollFromWindow"
              @lock-time="handleLockTimeWindow"
              @refresh="refreshFreeTimeWindows"
            />
          </div>

          <!-- Availability Manager (for host) -->
          <div v-if="event.status === 'polling' && isHost && showAvailabilityManager">
            <AvailabilityManager
              ref="availabilityManagerRef"
              :event-id="event.id"
              :primary-color="themeStyle.color"
              @refresh="refreshFreeTimeWindows"
              @updated="handleAvailabilityUpdated"
            />
          </div>

          <!-- Toggle Buttons (for host) -->
          <div v-if="event.status === 'polling' && isHost && !showAvailabilityPicker && !showAvailabilityManager" class="flex gap-3 mb-4">
            <button
              @click="showAvailabilityManager = true"
              type="button"
              class="flex-1 px-4 py-3 text-sm font-black uppercase border-2 border-black bg-green-500 text-black transition-all hover:translate-x-1 hover:translate-y-1"
            >
              Manage All Availability
            </button>
          </div>

          <div v-if="event.status === 'polling' && isHost && showAvailabilityManager" class="mb-4">
            <button
              @click="showAvailabilityManager = false"
              type="button"
              class="px-4 py-3 text-sm font-bold uppercase border-2 hover:opacity-100 opacity-60 transition-opacity"
              :style="{ borderColor: themeStyle.color }"
            >
              ← Back to Free Windows
            </button>
          </div>

          <!-- Toggle Availability Picker Button (for participants) -->
          <div v-if="event.status === 'polling' && !isHost && !showAvailabilityPicker" class="border-4 p-6 relative bg-white/5 backdrop-blur-sm" :style="{ borderColor: themeStyle.borderColor || '#FF8A95' }">
            <button
              @click="showAvailabilityPicker = true"
              type="button"
              class="w-full px-6 py-4 text-sm font-black uppercase border-2 transition-all hover:translate-x-1 hover:translate-y-1"
              :style="{
                'background-color': (event?.theme_config?.primary_color && event.theme_config.primary_color !== '#000000' && event.theme_config.primary_color !== 'rgb(0, 0, 0)') 
                  ? event.theme_config.primary_color 
                  : '#FF8A95',
                'color': '#000000',
                'border-color': (event?.theme_config?.primary_color && event.theme_config.primary_color !== '#000000' && event.theme_config.primary_color !== 'rgb(0, 0, 0)') 
                  ? event.theme_config.primary_color 
                  : '#FF8A95',
                'mix-blend-mode': 'normal'
              }"
            >
              Set Your Availability
            </button>
          </div>

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
              :primary-color="themeStyle.borderColor"
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

<style scoped>
</style>

<style>
/* Global animation definitions for dynamic elements in EventDetail */
@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

@keyframes emoji-fall {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg);
    opacity: 0.7;
  }
  50% {
    transform: translateX(calc(var(--random-x, 0) * 50px)) rotate(180deg);
  }
  100% {
    transform: translateY(100vh) translateX(calc(var(--random-x, 0) * 100px)) rotate(360deg);
    opacity: 0;
  }
}
</style>

