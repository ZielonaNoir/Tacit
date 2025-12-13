<template>
  <div class="border-4 p-6 relative backdrop-blur-sm" :class="isLight ? 'bg-white/80' : 'bg-white/5'" :style="{ borderColor: primaryColor }">
    <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
      Set Your Availability
    </div>

    <div class="space-y-6 mt-4">
      <!-- Instructions -->
      <div class="text-xs font-mono opacity-70">
        Select the time slots when you're available. Your selections will be used to find the best meeting time.
      </div>

      <!-- Date Range Selection -->
      <div class="grid grid-cols-2 gap-4">
        <div class="relative">
          <label 
            class="absolute -top-2 left-2 bg-black px-2 text-[10px] font-bold uppercase tracking-wider text-white"
          >
            Start Date
          </label>
          <input
            v-model="startDate"
            type="date"
            class="w-full px-4 py-3 bg-transparent border-2 focus:outline-none focus:border-coral-pink transition-colors font-mono text-sm"
            :style="{ borderColor: primaryColor }"
            @change="onDateChange"
          />
        </div>
        <div class="relative">
          <label 
            class="absolute -top-2 left-2 bg-black px-2 text-[10px] font-bold uppercase tracking-wider text-white"
          >
            End Date
          </label>
          <input
            v-model="endDate"
            type="date"
            class="w-full px-4 py-3 bg-transparent border-2 focus:outline-none focus:border-coral-pink transition-colors font-mono text-sm"
            :style="{ borderColor: primaryColor }"
            @change="onDateChange"
          />
        </div>
      </div>

      <!-- Time Slots Display -->
      <div v-if="dateRange.length > 0" class="space-y-4">
        <div v-for="date in dateRange" :key="date" class="space-y-3">
          <div class="font-bold uppercase text-sm tracking-wider flex items-center justify-between">
            <span>{{ formatDate(date) }}</span>
            <button
              @click="addTimeSlot(date)"
              type="button"
              class="text-xs font-mono uppercase hover:opacity-100 opacity-60 transition-opacity"
              :style="{ color: primaryColor }"
            >
              + Add Slot
            </button>
          </div>

          <!-- Time Slots for this date -->
          <div v-if="getSlotsForDate(date).length > 0" class="space-y-2">
            <div
              v-for="(slot, index) in getSlotsForDate(date)"
              :key="`${date}-${index}`"
              class="flex items-center gap-3 p-3 border-2 bg-white/5 relative"
              :style="{ borderColor: primaryColor }"
            >
              <div class="flex-1 grid grid-cols-2 gap-3">
                <div class="relative">
                  <label 
                    class="absolute -top-2 left-2 bg-black px-1 text-[9px] font-bold uppercase text-white"
                  >Start</label>
                  <input
                    v-model="slot.start"
                    type="time"
                    class="w-full px-3 py-2 bg-transparent border focus:outline-none text-xs font-mono"
                    :style="{ borderColor: primaryColor }"
                    @change="updateSlot(date, index)"
                  />
                </div>
                <div class="relative">
                  <label 
                    class="absolute -top-2 left-2 bg-black px-1 text-[9px] font-bold uppercase text-white"
                  >End</label>
                  <input
                    v-model="slot.end"
                    type="time"
                    class="w-full px-3 py-2 bg-transparent border focus:outline-none text-xs font-mono"
                    :style="{ borderColor: primaryColor }"
                    @change="updateSlot(date, index)"
                  />
                </div>
              </div>
              <button
                @click="removeTimeSlot(date, index)"
                type="button"
                class="px-3 py-1 bg-red-500 text-black text-xs font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
          <div v-else class="text-xs opacity-50 italic">No time slots added for this date</div>
        </div>
      </div>
      <div v-else class="text-xs opacity-50 italic">
        Select start and end dates to begin
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end gap-4 pt-4 border-t-2" :style="{ borderColor: primaryColor }">
        <button
          @click="$emit('cancel')"
          type="button"
          class="px-6 py-2 text-xs font-bold uppercase border-2 hover:opacity-100 opacity-60 transition-opacity"
          :style="{ borderColor: primaryColor }"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          type="button"
          :disabled="!canSubmit || isSubmitting"
          class="px-6 py-2 text-xs font-black uppercase border-2 border-black transition-all hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
          :style="{ 
            backgroundColor: canSubmit && !isSubmitting ? primaryColor : 'transparent',
            color: canSubmit && !isSubmitting ? 'black' : 'inherit'
          }"
        >
          {{ isSubmitting ? 'Submitting...' : 'Submit Availability' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { submitAvailability, fetchEventAvailabilities } from '../services'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import type { AvailabilitySlot } from '@/types/database'
import { format } from 'date-fns'

const props = defineProps<{
  eventId: string
  primaryColor?: string
  isLight?: boolean
}>()

const emit = defineEmits<{
  submitted: []
  cancel: []
}>()

const { user } = useAuth()
const identity = useGuestIdentity()

const startDate = ref('')
const endDate = ref('')
const timeSlots = ref<Record<string, Array<{ start: string; end: string }>>>({})
const isSubmitting = ref(false)

// Generate date range array
const dateRange = computed(() => {
  if (!startDate.value || !endDate.value) return []
  
  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  const dates: string[] = []
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  
  return dates
})

// Check if can submit
const canSubmit = computed(() => {
  return dateRange.value.length > 0 && 
         Object.values(timeSlots.value).some(slots => slots.length > 0)
})

const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'EEE, MMM d')
}

const getSlotsForDate = (date: string) => {
  return timeSlots.value[date] || []
}

const addTimeSlot = (date: string) => {
  if (!timeSlots.value[date]) {
    timeSlots.value[date] = []
  }
  timeSlots.value[date].push({
    start: '09:00',
    end: '17:00'
  })
}

const removeTimeSlot = (date: string, index: number) => {
  if (timeSlots.value[date]) {
    timeSlots.value[date].splice(index, 1)
    if (timeSlots.value[date].length === 0) {
      delete timeSlots.value[date]
    }
  }
}

const updateSlot = (date: string, index: number) => {
  // Validation: end time should be after start time
  const slot = timeSlots.value[date][index]
  if (slot.start >= slot.end) {
    alert('结束时间必须晚于开始时间')
    slot.end = slot.start
  }
}

const onDateChange = () => {
  // Clean up slots for dates outside the range
  const validDates = new Set(dateRange.value)
  for (const date in timeSlots.value) {
    if (!validDates.has(date)) {
      delete timeSlots.value[date]
    }
  }
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    // Ensure guest exists in database before submitting (required for foreign key constraint)
    if (!user.value) {
      await identity.ensureGuestExists()
    }

    // Convert time slots to AvailabilitySlot format
    const slots: AvailabilitySlot[] = []
    
    for (const date in timeSlots.value) {
      for (const slot of timeSlots.value[date]) {
        const startDateTime = new Date(`${date}T${slot.start}`)
        const endDateTime = new Date(`${date}T${slot.end}`)
        
        // If end time is earlier than start time, assume it's next day
        if (endDateTime <= startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1)
        }
        
        slots.push({
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString()
        })
      }
    }

    // Submit availability
    await submitAvailability(
      props.eventId,
      slots,
      {
        user_id: user.value?.id || null,
        guest_id: identity.guestId.value || null
      }
    )

    emit('submitted')
    alert('可用时间已提交！')
  } catch (err) {
    console.error('Error submitting availability:', err)
    alert(`提交失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    isSubmitting.value = false
  }
}

// Load existing availability on mount
const loadExistingAvailability = async () => {
  try {
    // Ensure guest exists in database before fetching (in case they already have availability)
    if (!user.value) {
      await identity.ensureGuestExists()
    }

    const availabilities = await fetchEventAvailabilities(props.eventId)
    const currentIdentity = {
      user_id: user.value?.id || null,
      guest_id: identity.guestId.value || null
    }
    
    const existing = availabilities.find(avail => 
      (currentIdentity.user_id && avail.user_id === currentIdentity.user_id) ||
      (currentIdentity.guest_id && avail.guest_id === currentIdentity.guest_id)
    )

    if (existing && existing.available_slots.length > 0) {
      // Parse existing slots back into date-based format
      const slotsByDate: Record<string, Array<{ start: string; end: string }>> = {}
      
      for (const slot of existing.available_slots) {
        const start = new Date(slot.start)
        const dateKey = start.toISOString().split('T')[0]
        
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = []
        }
        
        slotsByDate[dateKey].push({
          start: format(start, 'HH:mm'),
          end: format(new Date(slot.end), 'HH:mm')
        })
      }
      
      timeSlots.value = slotsByDate
      
      // Set date range from existing slots
      const dates = Object.keys(slotsByDate).sort()
      if (dates.length > 0) {
        startDate.value = dates[0]
        endDate.value = dates[dates.length - 1]
      }
    }
  } catch (err) {
    console.warn('Could not load existing availability:', err)
  }
}

// Load on mount
loadExistingAvailability()
</script>

