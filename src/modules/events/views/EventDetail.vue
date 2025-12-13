<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { fetchEvent, fetchEventPolls, fetchPollVotes, fetchRSVPs, submitPollVote } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import ActivityFeed from '@/modules/feed/components/ActivityFeed.vue'
import type { TacitEvent, EventTimePoll, EventPollVote, RSVP } from '@/types/database'
import type { PollVoteStatus } from '@/types/database'

const route = useRoute()
const { user, isAuthenticated } = useAuth()
const { getIdentityPayload } = useGuestIdentity()

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
  const eventId = route.params.id as string
  try {
    event.value = await fetchEvent(eventId)
    polls.value = await fetchEventPolls(eventId)
    
    // Fetch votes for each poll
    for (const poll of polls.value) {
      pollVotes.value[poll.id] = await fetchPollVotes(poll.id)
    }
    
    rsvps.value = await fetchRSVPs(eventId)
  } catch (err) {
    console.error('Error fetching event data:', err)
  } finally {
    loading.value = false
  }
})

const getVoteCounts = (pollId: string) => {
  const votes = pollVotes.value[pollId] || []
  return {
    yes: votes.filter(v => v.status === 'yes').length,
    ifNeedBe: votes.filter(v => v.status === 'if_need_be').length,
    no: votes.filter(v => v.status === 'no').length
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
    const identity = getIdentityPayload(user.value?.id)
    await submitPollVote(pollId, status, identity)
    
    // Refresh votes for this poll
    pollVotes.value[pollId] = await fetchPollVotes(pollId)
  } catch (err) {
    console.error('Error submitting vote:', err)
    alert('投票失败，请重试')
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
      <div class="font-mono text-[10px] opacity-50">ID: {{ event.id.slice(0, 8) }}</div>
    </div>

    <!-- 主容器 -->
    <div class="container mx-auto px-4 py-24 relative z-10">
      <div class="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <!-- 左侧：主要信息 (海报风格) -->
        <div class="lg:col-span-7 space-y-12">
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
            <div v-if="event.modules_config.spotify?.url" class="border-4 p-1" :style="{ borderColor: themeStyle.color }">
              <div class="bg-black p-2 mb-1 text-white text-xs font-bold uppercase text-center">Sonic Landscape</div>
              <iframe
                :src="event.modules_config.spotify.url.replace('open.spotify.com', 'open.spotify.com/embed')"
                width="100%"
                height="152"
                frameborder="0"
                allowtransparency="true"
                allow="encrypted-media"
                class="grayscale hover:grayscale-0 transition-all duration-500"
              ></iframe>
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
          </div>
        </div>

        <!-- 右侧：互动区域 -->
        <div class="lg:col-span-5 space-y-8">
          <!-- Date Polling Section -->
          <div v-if="polls.length > 0" class="border-4 p-6 relative bg-white/5 backdrop-blur-sm" :style="{ borderColor: themeStyle.color }">
            <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
              Select Protocol
            </div>
            
            <div class="space-y-4 mt-2">
              <div
                v-for="poll in polls"
                :key="poll.id"
                class="p-4 border-2 border-dashed transition-all hover:border-solid hover:bg-current/10"
                :style="{ borderColor: themeStyle.color }"
              >
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

          <!-- Activity Feed -->
          <div class="border-t-4 border-b-4 py-6" :style="{ borderColor: themeStyle.color }">
            <h2 class="text-2xl font-black uppercase mb-6 tracking-tighter">Live Feed</h2>
            <ActivityFeed :event-id="event.id" :is-host="!!isHost" />
          </div>

          <!-- Guest List -->
          <div v-if="event.show_guest_list && rsvps.length > 0">
            <h2 class="text-sm font-bold uppercase mb-4 opacity-50 tracking-widest">Manifest ({{ rsvps.filter(r => r.status === 'going').length }})</h2>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="rsvp in rsvps.filter(r => r.status === 'going')"
                :key="rsvp.id"
                class="group relative"
              >
                <div class="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs hover:scale-110 transition-transform cursor-help bg-current text-black overflow-hidden" :style="{ borderColor: themeStyle.color }">
                  {{ isAuthenticated && rsvp.user_id ? 'U' : 'G' }}
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white">
                  {{ isAuthenticated && rsvp.user_id ? 'User' : (rsvp.guest_id ? 'Guest' : 'Anon') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

