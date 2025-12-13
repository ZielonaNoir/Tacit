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
const { getIdentityPayload, guestName } = useGuestIdentity()

const isHost = computed(() => {
  return event.value && user.value && event.value.creator_id === user.value.id
})

const event = ref<TacitEvent | null>(null)
const polls = ref<EventTimePoll[]>([])
const pollVotes = ref<Record<string, EventPollVote[]>>({})
const rsvps = ref<RSVP[]>([])
const loading = ref(true)

const themeStyle = computed(() => {
  if (!event.value?.theme_config) return {}
  const theme = event.value.theme_config
  return {
    fontFamily: theme.font || 'inherit',
    backgroundColor: theme.bg_color || '#ffffff',
    color: theme.primary_color || '#000000'
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
  <div v-if="loading" class="min-h-screen flex items-center justify-center">
    <p class="text-gray-500">加载中...</p>
  </div>

  <div v-else-if="!event" class="min-h-screen flex items-center justify-center">
    <p class="text-red-500">活动不存在</p>
  </div>

  <div
    v-else
    class="min-h-screen"
    :style="themeStyle"
  >
    <div class="container mx-auto px-4 py-8">
      <!-- Event Header -->
      <div class="bg-white border-2 border-black shadow-retro p-8 mb-6">
        <h1 class="text-5xl font-heading font-bold mb-4">{{ event.title }}</h1>
        <p v-if="event.description" class="text-lg mb-4">{{ event.description }}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div v-if="event.start_time">
            <h3 class="font-semibold mb-1">时间</h3>
            <p>{{ new Date(event.start_time).toLocaleString() }}</p>
          </div>
          <div v-if="event.location_name">
            <h3 class="font-semibold mb-1">地点</h3>
            <p>{{ event.location_name }}</p>
            <p v-if="event.location_address" class="text-sm text-gray-600">{{ event.location_address }}</p>
          </div>
        </div>
      </div>

      <!-- Date Polling Section -->
      <div v-if="polls.length > 0" class="bg-white border-2 border-black shadow-retro p-6 mb-6">
        <h2 class="text-3xl font-heading font-bold mb-6">选择时间</h2>
        <div class="space-y-4">
          <div
            v-for="poll in polls"
            :key="poll.id"
            class="border-2 border-gray-300 p-4"
          >
            <div class="flex justify-between items-center mb-3">
              <div>
                <p class="font-semibold">
                  {{ new Date(poll.start_time).toLocaleString() }}
                </p>
                <p v-if="poll.end_time" class="text-sm text-gray-600">
                  至 {{ new Date(poll.end_time).toLocaleString() }}
                </p>
              </div>
              <div class="flex gap-2 text-sm">
                <span class="text-green-600">✓ {{ getVoteCounts(poll.id).yes }}</span>
                <span class="text-yellow-600">? {{ getVoteCounts(poll.id).ifNeedBe }}</span>
                <span class="text-red-600">✗ {{ getVoteCounts(poll.id).no }}</span>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button
                @click="handleVote(poll.id, 'yes')"
                class="px-4 py-2 bg-green-500 text-white border-2 border-black shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                :class="{ 'opacity-50 cursor-not-allowed': getUserVote(poll.id) === 'yes' }"
              >
                ✓ 可以
              </button>
              <button
                @click="handleVote(poll.id, 'if_need_be')"
                class="px-4 py-2 bg-yellow-500 text-white border-2 border-black shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                :class="{ 'opacity-50 cursor-not-allowed': getUserVote(poll.id) === 'if_need_be' }"
              >
                ? 可能
              </button>
              <button
                @click="handleVote(poll.id, 'no')"
                class="px-4 py-2 bg-red-500 text-white border-2 border-black shadow-retro hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                :class="{ 'opacity-50 cursor-not-allowed': getUserVote(poll.id) === 'no' }"
              >
                ✗ 不行
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modules Section -->
      <div v-if="event.modules_config" class="bg-white border-4 border-black shadow-retro p-6 mb-6 space-y-6">
        <h2 class="text-3xl font-heading font-bold mb-4">Event Details</h2>
        
        <!-- Spotify -->
        <div v-if="event.modules_config.spotify?.url" class="border-4 border-black p-4">
          <h3 class="font-bold mb-2">🎵 Spotify Playlist</h3>
          <iframe
            :src="event.modules_config.spotify.url.replace('open.spotify.com', 'open.spotify.com/embed')"
            width="100%"
            height="352"
            frameborder="0"
            allowtransparency="true"
            allow="encrypted-media"
            class="border-4 border-black"
          ></iframe>
        </div>

        <!-- Gift Registry -->
        <div v-if="event.modules_config.gift_registry?.items?.length" class="border-4 border-black p-4">
          <h3 class="font-bold mb-2">🎁 Gift Registry</h3>
          <ul class="space-y-2">
            <li v-for="(item, index) in event.modules_config.gift_registry.items" :key="index">
              <a :href="item" target="_blank" class="text-coral-pink hover:underline font-bold">
                Gift {{ index + 1 }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Dress Code -->
        <div v-if="event.modules_config.dress_code?.text" class="border-4 border-black p-4">
          <h3 class="font-bold mb-2">👔 Dress Code</h3>
          <p class="font-semibold">{{ event.modules_config.dress_code.text }}</p>
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="bg-white border-4 border-black shadow-retro p-6 mb-6">
        <h2 class="text-3xl font-heading font-bold mb-4">Activity Feed</h2>
        <ActivityFeed :event-id="event.id" :is-host="isHost" />
      </div>

      <!-- Guest List -->
      <div v-if="event.show_guest_list && rsvps.length > 0" class="bg-white border-4 border-black shadow-retro p-6">
        <h2 class="text-3xl font-heading font-bold mb-4">Participants</h2>
        <div class="space-y-3">
          <div
            v-for="rsvp in rsvps.filter(r => r.status === 'going')"
            :key="rsvp.id"
            class="flex items-center gap-3 p-4 border-4 border-black"
          >
            <div class="w-12 h-12 rounded-full bg-brand-purple flex items-center justify-center text-white font-black text-xl">
              {{ isAuthenticated && rsvp.user_id ? 'U' : 'G' }}
            </div>
            <div class="flex-1">
              <p class="font-bold text-lg">
                {{ isAuthenticated && rsvp.user_id ? 'User' : (rsvp.guest_id ? 'Guest' : 'Anonymous') }}
              </p>
              <p v-if="rsvp.comment" class="text-sm text-gray-600 mt-1">{{ rsvp.comment }}</p>
              <p v-if="rsvp.guests_count > 0" class="text-sm text-gray-600 mt-1">
                +{{ rsvp.guests_count }} guest{{ rsvp.guests_count > 1 ? 's' : '' }}
              </p>
            </div>
            <div v-if="isHost" class="flex gap-2">
              <button
                class="px-4 py-2 bg-red-600 text-white font-bold border-4 border-black hover:translate-x-1 hover:translate-y-1 transition-all uppercase text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

