<template>
  <div class="border-4 p-6 relative backdrop-blur-sm" :class="isLight ? 'bg-white/80' : 'bg-white/5'" :style="{ borderColor: primaryColor }">
    <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
      Free Time Windows
    </div>

    <div class="space-y-4 mt-4">
      <!-- Description -->
      <div class="text-xs font-mono opacity-70">
        Time windows when all participants are available (calculated automatically)
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8 text-sm opacity-50">
        Calculating free time windows...
      </div>

      <!-- Empty State -->
      <div v-else-if="windows.length === 0" class="text-center py-8 text-sm opacity-50 border-2 border-dashed p-6" :style="{ borderColor: primaryColor }">
        No overlapping free time windows found yet. 
        <br />
        Ask participants to submit their availability.
      </div>

      <!-- Windows List -->
      <div v-else class="space-y-3">
        <div
          v-for="(window, index) in windows"
          :key="index"
          class="p-4 border-2 bg-green-500/10 relative"
          :style="{ borderColor: primaryColor }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="font-bold uppercase text-sm mb-1">
                {{ formatDateTimeRange(window.start, window.end) }}
              </div>
              <div class="text-xs font-mono opacity-70">
                {{ formatDuration(window.start, window.end) }}
              </div>
              <div class="mt-2 text-xs opacity-60">
                {{ window.participant_count }} participant{{ window.participant_count !== 1 ? 's' : '' }} available
              </div>
            </div>
            
            <!-- Host Actions -->
            <div v-if="isHost" class="flex gap-2">
              <button
                @click="handleCreatePoll(window)"
                type="button"
                class="px-3 py-1 bg-green-500 text-black text-xs font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Create Poll
              </button>
            <button
              @click="handleLockTime(window)"
              type="button"
              class="px-3 py-1 bg-white text-black text-xs font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Lock & Set
            </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions Footer -->
      <div class="flex justify-end pt-4 border-t-2" :style="{ borderColor: primaryColor }">
        <button
          @click="$emit('refresh')"
          type="button"
          class="px-4 py-2 text-xs font-bold uppercase border-2 hover:opacity-100 opacity-60 transition-opacity"
          :style="{ borderColor: primaryColor }"
        >
          Refresh
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { differenceInHours, differenceInMinutes } from 'date-fns'
import type { FreeTimeWindow } from '@/types/database'

defineProps<{
  windows: FreeTimeWindow[]
  loading?: boolean
  isHost?: boolean
  primaryColor?: string
  isLight?: boolean
}>()

const emit = defineEmits<{
  createPoll: [window: FreeTimeWindow]
  lockTime: [window: FreeTimeWindow]
  refresh: []
}>()

const formatDateTimeRange = (startStr: string, endStr: string) => {
  const start = new Date(startStr)
  const end = new Date(endStr)
  
  // Check if same day
  const isSameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
  
  if (isSameDay) {
    // Same day: "Sun, Dec 14, 2025 • 11:30 - 12:00"
    return `${format(start, 'EEE, MMM d, yyyy')} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
  } else {
    // Different days: "Sun, Dec 14, 2025 • 11:30 - Mon, Dec 15, 2025 • 12:00"
    return `${format(start, 'EEE, MMM d, yyyy • HH:mm')} - ${format(end, 'EEE, MMM d, yyyy • HH:mm')}`
  }
}

const formatDuration = (startStr: string, endStr: string) => {
  const start = new Date(startStr)
  const end = new Date(endStr)
  const hours = differenceInHours(end, start)
  const minutes = differenceInMinutes(end, start) % 60
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}m`
  }
}

const handleCreatePoll = (window: FreeTimeWindow) => {
  emit('createPoll', window)
}

const handleLockTime = (window: FreeTimeWindow) => {
  emit('lockTime', window)
}
</script>

