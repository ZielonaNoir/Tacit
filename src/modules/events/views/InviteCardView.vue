<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import { fetchEvent } from '../services'
import { fetchInviteCardByCode } from '@/modules/polling/services'
import { submitRSVP } from '../services'
import type { TacitEvent, InviteCard, RSVPStatus } from '@/types/database'
import { format } from 'date-fns'

const route = useRoute()
const router = useRouter()
const { user, profile } = useAuth()
const { guestName, isGuestSetup, updateGuestProfile, getIdentityPayloadSafe, ensureGuestExists } = useGuestIdentity()

const eventId = route.params.eventId as string
const inviteCode = route.params.code as string

const loading = ref(true)
const event = ref<TacitEvent | null>(null)
const inviteCard = ref<InviteCard | null>(null)
const error = ref<string | null>(null)

// Guest identity input (for anonymous users)
const guestNameInput = ref('')
const showGuestNameInput = ref(false)

// RSVP state
const rsvpStatus = ref<RSVPStatus | null>(null)
const guestCount = ref(1)
const comment = ref('')
const submitting = ref(false)

// Theme style
const themeStyle = computed(() => {
  if (!event.value) return {}
  const config = event.value.theme_config || {}
  return {
    font: config.font || 'Inter',
    color: config.primary_color || '#FF8A95',
    bgColor: config.bg_color || '#000000',
    effects: config.effects || []
  }
})

// Check if user is logged in or has guest name
const isIdentified = computed(() => {
  return !!user.value || isGuestSetup.value
})

const displayName = computed(() => {
  if (user.value) {
    return profile.value?.full_name || profile.value?.username || user.value.email || 'User'
  }
  return guestName.value || 'Guest'
})

onMounted(async () => {
  try {
    // Load invite card
    const card = await fetchInviteCardByCode(inviteCode)
    if (!card) {
      error.value = 'Invalid invite code'
      return
    }
    
    if (card.event_id !== eventId) {
      error.value = 'Invite code does not match event'
      return
    }

    inviteCard.value = card

    // Load event
    const eventData = await fetchEvent(eventId)
    event.value = eventData

    // Mark invite card as opened if not already
    if (card.status === 'pending' || card.status === 'sent') {
      await supabase
        .from('invite_cards')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString()
        })
        .eq('id', card.id)
    }

    // Check if user is logged in
    if (user.value) {
      // Logged in user - auto-fill
      showGuestNameInput.value = false
    } else {
      // Anonymous user - check if guest name is set
      if (!isGuestSetup.value) {
        showGuestNameInput.value = true
      } else {
        // Ensure guest exists in DB
        await ensureGuestExists()
      }
    }

    // Check existing RSVP
    await loadExistingRSVP()
  } catch (err: any) {
    console.error('Failed to load invite card:', err)
    error.value = err.message || 'Failed to load invite card'
  } finally {
    loading.value = false
  }
})

const loadExistingRSVP = async () => {
  try {
    const identity = await getIdentityPayloadSafe(user.value?.id)
    
    let query = supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', eventId)

    if (identity.user_id) {
      query = query.eq('user_id', identity.user_id)
    } else if (identity.guest_id) {
      query = query.eq('guest_id', identity.guest_id)
    }

    const { data } = await query.maybeSingle()
    
    if (data) {
      rsvpStatus.value = data.status as RSVPStatus
      guestCount.value = (data.guests_count || 0) + 1
      comment.value = data.comment || ''
    }
  } catch (err) {
    console.error('Failed to load existing RSVP:', err)
  }
}

const handleSetGuestName = async () => {
  if (!guestNameInput.value.trim()) {
    alert('Please enter your name')
    return
  }

  await updateGuestProfile(guestNameInput.value.trim())
  await ensureGuestExists()
  showGuestNameInput.value = false
}

const handleRSVP = async (status: RSVPStatus) => {
  if (!isIdentified.value) {
    if (!guestNameInput.value.trim()) {
      alert('Please enter your name first')
      return
    }
    await handleSetGuestName()
  }

  submitting.value = true
  try {
    const identity = await getIdentityPayloadSafe(user.value?.id)
    
    await submitRSVP(
      eventId,
      status,
      identity,
      {
        guests_count: Math.max(0, guestCount.value - 1),
        comment: comment.value.trim() || undefined
      }
    )

    rsvpStatus.value = status

    // Mark invite card as responded
    if (inviteCard.value) {
      await supabase
        .from('invite_cards')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteCard.value.id)
    }

    // Create activity log
    const userName = displayName.value
    await supabase.from('activities').insert({
      event_id: eventId,
      ...identity,
      type: 'rsvp_log',
      content: `${userName} RSVP'd ${status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Not Going'}`
    })

    alert('RSVP submitted successfully!')
  } catch (err: any) {
    console.error('Failed to submit RSVP:', err)
    alert(err.message || 'Failed to submit RSVP')
  } finally {
    submitting.value = false
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'TBD'
  return format(new Date(dateString), 'MMM dd, yyyy')
}

const formatTime = (dateString: string | null) => {
  if (!dateString) return ''
  return format(new Date(dateString), 'HH:mm')
}
</script>

<template>
  <div 
    class="min-h-screen flex items-center justify-center p-4"
    :style="{ 
      backgroundColor: themeStyle.bgColor || '#000000',
      color: themeStyle.color || '#FF8A95',
      fontFamily: themeStyle.font || 'Inter, sans-serif'
    }"
  >
    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <div class="animate-pulse text-2xl font-bold uppercase tracking-wider">Loading...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center max-w-md">
      <div class="border-4 border-current p-8 bg-black/50">
        <h1 class="text-2xl font-black mb-4 uppercase">Error</h1>
        <p class="mb-6">{{ error }}</p>
        <button
          @click="router.push('/')"
          class="px-6 py-3 border-4 border-current bg-current text-black font-bold uppercase hover:opacity-80 transition-opacity"
        >
          Go Home
        </button>
      </div>
    </div>

    <!-- Invite Card -->
    <div v-else-if="event && inviteCard" class="w-full max-w-2xl">
      <div class="border-4 border-current bg-black/50 p-8 md:p-12 relative">
        <!-- Corner decorations -->
        <div class="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-current"></div>
        <div class="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-current"></div>
        <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-current"></div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-current"></div>

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-xs font-mono uppercase tracking-[0.3em] mb-2 opacity-70">Invitation</div>
          <h1 class="text-4xl md:text-5xl font-black mb-4 uppercase tracking-tight leading-tight">
            {{ event.title }}
          </h1>
          <div v-if="event.description" class="text-lg opacity-90 max-w-xl mx-auto">
            {{ event.description }}
          </div>
        </div>

        <!-- Event Details -->
        <div class="space-y-4 mb-8 border-t-2 border-current pt-6">
          <div v-if="event.start_time" class="flex items-center gap-3">
            <iconify-icon icon="material-symbols:calendar-today" class="text-2xl" />
            <div>
              <div class="font-bold text-lg">{{ formatDate(event.start_time) }}</div>
              <div class="text-sm opacity-70">{{ formatTime(event.start_time) }} - {{ formatTime(event.end_time) }}</div>
            </div>
          </div>
          <div v-else class="flex items-center gap-3">
            <iconify-icon icon="material-symbols:poll" class="text-2xl" />
            <div class="font-bold text-lg">Date TBD (Polling Mode)</div>
          </div>

          <div v-if="event.location_name" class="flex items-center gap-3">
            <iconify-icon icon="material-symbols:location-on" class="text-2xl" />
            <div>
              <div class="font-bold">{{ event.location_name }}</div>
              <div v-if="event.location_address" class="text-sm opacity-70">{{ event.location_address }}</div>
            </div>
          </div>
        </div>

        <!-- Guest Name Input (Anonymous Users) -->
        <div v-if="showGuestNameInput" class="mb-8 p-4 border-2 border-current bg-current/10">
          <label class="block font-bold mb-2 uppercase text-sm tracking-wider">Your Name</label>
          <div class="flex gap-2">
            <input
              v-model="guestNameInput"
              type="text"
              placeholder="Enter your name"
              class="flex-1 px-4 py-3 bg-black/50 border-2 border-current text-current placeholder-current/50 focus:outline-none focus:ring-2 focus:ring-current font-bold"
              @keyup.enter="handleSetGuestName"
            />
            <button
              @click="handleSetGuestName"
              class="px-6 py-3 border-2 border-current bg-current text-black font-bold uppercase hover:opacity-80 transition-opacity"
            >
              Set
            </button>
          </div>
          <p class="text-xs mt-2 opacity-70 font-mono">This helps identify you in the guest list</p>
        </div>

        <!-- User Info (Logged in or Guest with name) -->
        <div v-if="isIdentified && !showGuestNameInput" class="mb-8 p-4 border-2 border-current/50 bg-current/5">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-mono uppercase tracking-wider opacity-70 mb-1">You are</div>
              <div class="font-bold text-lg">{{ displayName }}</div>
            </div>
            <div v-if="!user" class="text-xs font-mono opacity-70">Guest Mode</div>
          </div>
        </div>

        <!-- RSVP Section -->
        <div class="space-y-6">
          <div>
            <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Your RSVP</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                @click="handleRSVP('going')"
                :disabled="submitting || !isIdentified"
                :class="[
                  'p-4 border-4 font-bold uppercase transition-all',
                  rsvpStatus === 'going'
                    ? 'bg-current text-black border-current'
                    : 'bg-transparent border-current hover:bg-current/20',
                  (submitting || !isIdentified) && 'opacity-50 cursor-not-allowed'
                ]"
              >
                <iconify-icon icon="material-symbols:check-circle" class="text-2xl mb-1 block mx-auto" />
                <div class="text-sm">Going</div>
              </button>
              <button
                @click="handleRSVP('maybe')"
                :disabled="submitting || !isIdentified"
                :class="[
                  'p-4 border-4 font-bold uppercase transition-all',
                  rsvpStatus === 'maybe'
                    ? 'bg-current text-black border-current'
                    : 'bg-transparent border-current hover:bg-current/20',
                  (submitting || !isIdentified) && 'opacity-50 cursor-not-allowed'
                ]"
              >
                <iconify-icon icon="material-symbols:help" class="text-2xl mb-1 block mx-auto" />
                <div class="text-sm">Maybe</div>
              </button>
              <button
                @click="handleRSVP('not_going')"
                :disabled="submitting || !isIdentified"
                :class="[
                  'p-4 border-4 font-bold uppercase transition-all',
                  rsvpStatus === 'not_going'
                    ? 'bg-current text-black border-current'
                    : 'bg-transparent border-current hover:bg-current/20',
                  (submitting || !isIdentified) && 'opacity-50 cursor-not-allowed'
                ]"
              >
                <iconify-icon icon="material-symbols:close" class="text-2xl mb-1 block mx-auto" />
                <div class="text-sm">Can't Go</div>
              </button>
            </div>
          </div>

          <!-- Guest Count -->
          <div v-if="rsvpStatus === 'going' || rsvpStatus === 'maybe'">
            <label class="block font-bold mb-2 uppercase text-sm tracking-wider">Additional Guests (+1s)</label>
            <input
              v-model.number="guestCount"
              type="number"
              min="1"
              max="10"
              class="w-full px-4 py-3 bg-black/50 border-2 border-current text-current focus:outline-none focus:ring-2 focus:ring-current font-bold"
            />
          </div>

          <!-- Comment -->
          <div>
            <label class="block font-bold mb-2 uppercase text-sm tracking-wider">Comment (Optional)</label>
            <textarea
              v-model="comment"
              rows="3"
              placeholder="Add a message..."
              class="w-full px-4 py-3 bg-black/50 border-2 border-current text-current placeholder-current/50 focus:outline-none focus:ring-2 focus:ring-current font-bold resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-8 pt-6 border-t-2 border-current/30 text-center">
          <button
            @click="router.push(`/events/${eventId}`)"
            class="text-sm font-mono uppercase tracking-wider hover:underline opacity-70 hover:opacity-100 transition-opacity"
          >
            View Full Event →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>

