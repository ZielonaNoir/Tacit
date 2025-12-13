<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import { submitRSVP } from '../services'
import type { RSVP, RSVPStatus } from '@/types/database'

const props = defineProps<{
  eventId: string
  rsvps: RSVP[]
  isHost: boolean
  approvalRequired?: boolean
  primaryColor?: string
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const { user } = useAuth()
const { getIdentityPayloadSafe, guestName } = useGuestIdentity()

const statusFilter = ref<RSVPStatus | 'all'>('all')
const newGuestCount = ref(1)
const isSubmitting = ref(false)

const filteredRSVPs = computed(() => {
  if (statusFilter.value === 'all') {
    return props.rsvps
  }
  return props.rsvps.filter(r => r.status === statusFilter.value)
})

const statusCounts = computed(() => {
  return {
    going: props.rsvps.filter(r => r.status === 'going').length,
    maybe: props.rsvps.filter(r => r.status === 'maybe').length,
    not_going: props.rsvps.filter(r => r.status === 'not_going').length,
    waitlist: props.rsvps.filter(r => r.status === 'waitlist').length
  }
})

const handleRSVP = async (status: RSVPStatus, guestCount: number = 1) => {
  if (isSubmitting.value) {
    console.log('[GuestList] Already submitting, ignoring click')
    return
  }

  isSubmitting.value = true
  let identity: { user_id: string | null; guest_id: string | null } | null = null
  
  try {
    // Ensure guest exists in DB before submitting RSVP
    identity = await getIdentityPayloadSafe(user.value?.id)
    
    // Use submitRSVP service which handles both create and update
    const finalStatus = props.approvalRequired && status === 'going' ? 'waitlist' : status
    
    // guests_count 表示额外人数（不包括自己）
    // 如果 guestCount = 1（只有自己），那么 guests_count = 0
    // 如果 guestCount = 2（自己 + 1个朋友），那么 guests_count = 1
    const additionalGuests = Math.max(0, guestCount - 1)
    
    console.log('[GuestList] Submitting RSVP:', {
      eventId: props.eventId,
      status: finalStatus,
      originalStatus: status,
      guestCount,
      additionalGuests,
      identity,
      approvalRequired: props.approvalRequired
    })
    
    const result = await submitRSVP(
      props.eventId,
      finalStatus,
      identity,
      {
        guests_count: additionalGuests
        // comment and phone_number are optional and default to undefined
      }
    )

    console.log('[GuestList] RSVP submitted successfully:', result)

    // Create RSVP log activity
    const userName = user.value?.email || guestName.value || 'Guest'
    try {
      await supabase.from('activities').insert({
        event_id: props.eventId,
        ...identity,
        type: 'rsvp_log',
        content: `${userName} RSVP'd ${status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Not Going'}`
      })
    } catch (activityErr) {
      // Log activity error but don't fail the RSVP
      console.warn('[GuestList] Failed to create activity log:', activityErr)
    }

    emit('update')
  } catch (err) {
    console.error('[GuestList] Error submitting RSVP:', err)
    const errorMessage = err instanceof Error ? err.message : '未知错误'
    console.error('[GuestList] Full error details:', {
      error: err,
      eventId: props.eventId,
      status,
      user: user.value?.id,
      guest: identity?.guest_id
    })
    alert(`提交 RSVP 失败: ${errorMessage}`)
  } finally {
    isSubmitting.value = false
  }
}

const handleRemoveGuest = async (rsvpId: string) => {
  if (!confirm('Remove this guest from the event?')) return

  try {
    console.log('[GuestList] Removing RSVP:', rsvpId)
    const { error, data } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', rsvpId)
      .select()
    
    if (error) {
      console.error('[GuestList] Delete error:', error)
      throw error
    }
    
    console.log('[GuestList] Successfully removed RSVP:', data)
    emit('update')
  } catch (err) {
    console.error('Error removing guest:', err)
    const errorMessage = err instanceof Error ? err.message : '未知错误'
    alert(`移除失败: ${errorMessage}`)
  }
}

const handleApprove = async (rsvpId: string) => {
  try {
    const { error } = await supabase
      .from('rsvps')
      .update({ status: 'going' })
      .eq('id', rsvpId)

    if (error) throw error
    emit('update')
  } catch (err) {
    console.error('Error approving RSVP:', err)
    alert('Failed to approve')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- RSVP Buttons (for non-host guests) -->
    <div v-if="!isHost" class="border-2 p-6 rounded-lg" :style="{ borderColor: primaryColor || '#FF8A95' }">
      <h3 class="text-lg font-black uppercase mb-4 tracking-wider">Your RSVP</h3>
      <div class="flex gap-3">
        <button
          @click="handleRSVP('going', newGuestCount)"
          :disabled="isSubmitting"
          class="flex-1 px-6 py-3 bg-green-500 text-black font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          Going
        </button>
        <button
          @click="handleRSVP('maybe', newGuestCount)"
          :disabled="isSubmitting"
          class="flex-1 px-6 py-3 bg-yellow-500 text-black font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          Maybe
        </button>
        <button
          @click="handleRSVP('not_going')"
          :disabled="isSubmitting"
          class="flex-1 px-6 py-3 bg-red-500 text-black font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
        >
          Can't Go
        </button>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <label class="text-sm font-bold uppercase">+1s:</label>
        <input
          v-model.number="newGuestCount"
          type="number"
          min="1"
          max="10"
          class="w-20 px-3 py-2 border-2 border-black bg-white text-black font-bold"
        />
        <span class="text-xs opacity-60">(Including yourself)</span>
      </div>
    </div>

    <!-- Status Filter Tabs -->
    <div class="flex flex-wrap gap-2 pb-2">
      <button
        v-for="status in [
          { key: 'all', label: 'All', count: rsvps.length },
          { key: 'going', label: 'Going', count: statusCounts.going },
          { key: 'maybe', label: 'Maybe', count: statusCounts.maybe },
          { key: 'not_going', label: 'Cant', count: statusCounts.not_going },
          { key: 'waitlist', label: 'Waitlist', count: statusCounts.waitlist }
        ]"
        :key="status.key"
        @click="statusFilter = status.key as RSVPStatus | 'all'"
        class="px-3 py-1.5 rounded border-2 font-bold uppercase text-[10px] tracking-wider transition-all"
        :class="statusFilter === status.key ? 'bg-current text-black border-black' : 'border-current/30 hover:bg-white/5'"
        :style="statusFilter === status.key ? { backgroundColor: primaryColor || '#FF8A95' } : {}"
      >
        {{ status.label }} <span class="opacity-70">({{ status.count }})</span>
      </button>
    </div>

    <!-- Guest List -->
    <div class="space-y-2">
      <div
        v-for="rsvp in filteredRSVPs"
        :key="rsvp.id"
        class="p-3 border-2 rounded-lg flex items-start justify-between hover:bg-white/5 transition-colors gap-3"
        :style="{ borderColor: primaryColor || '#FF8A95' }"
      >
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div
            class="w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0"
            :style="{ borderColor: primaryColor || '#FF8A95', backgroundColor: primaryColor || '#FF8A95' }"
          >
            {{ rsvp.user_id ? 'U' : 'G' }}
          </div>
          <div class="flex-1 min-w-0 pt-1">
            <div class="font-bold text-sm truncate">
              {{ rsvp.user_id ? 'User' : 'Guest' }}
              <span v-if="rsvp.guests_count > 0" class="text-xs opacity-70 ml-1">+{{ rsvp.guests_count }}</span>
            </div>
            <!-- Display ID -->
            <div class="text-[10px] font-mono opacity-50 mt-1 break-all">
              ID: {{ rsvp.user_id || rsvp.guest_id || 'Unknown' }}
            </div>
            <div v-if="rsvp.comment" class="text-xs opacity-70 mt-1 break-words leading-tight">{{ rsvp.comment }}</div>
            <div class="flex flex-wrap gap-2 mt-2">
              <span
                class="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border border-black/20"
                :class="{
                  'bg-green-500 text-black': rsvp.status === 'going',
                  'bg-yellow-500 text-black': rsvp.status === 'maybe',
                  'bg-red-500 text-black': rsvp.status === 'not_going',
                  'bg-gray-500 text-white': rsvp.status === 'waitlist'
                }"
              >
                {{ rsvp.status }}
              </span>
              <span v-if="approvalRequired && rsvp.status === 'waitlist'" class="px-1.5 py-0.5 text-[10px] bg-orange-500 text-black font-bold uppercase rounded border border-black/20">
                Pending
              </span>
            </div>
          </div>
        </div>

        <!-- Host Controls -->
        <div v-if="isHost" class="flex flex-col gap-2 shrink-0">
          <button
            v-if="approvalRequired && rsvp.status === 'waitlist'"
            @click="handleApprove(rsvp.id)"
            class="px-2 py-1 bg-green-500 text-black font-bold uppercase text-[10px] border border-black hover:brightness-110 transition-all w-full"
          >
            Approve
          </button>
          <button
            @click="handleRemoveGuest(rsvp.id)"
            class="px-2 py-1 bg-red-600 text-white font-bold uppercase text-[10px] border border-black hover:brightness-110 transition-all w-full"
          >
            Remove
          </button>
        </div>
      </div>

      <div v-if="filteredRSVPs.length === 0" class="text-center py-12 text-sm opacity-50 uppercase font-bold">
        No guests in this category
      </div>
    </div>
  </div>
</template>

