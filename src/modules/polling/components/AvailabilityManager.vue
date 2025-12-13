<template>
  <div class="border-4 p-6 relative backdrop-blur-sm" :class="isLight ? 'bg-white/80' : 'bg-white/5'" :style="{ borderColor: primaryColor }">
    <div class="absolute -top-3 left-4 px-2 text-xs font-black uppercase tracking-widest bg-black text-white transform -skew-x-12">
      Availability Manager
    </div>

    <div class="space-y-4 mt-4">
      <!-- Description -->
      <div class="text-xs font-mono opacity-70">
        Manage all participants' availability records for this event
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8 text-sm opacity-50">
        Loading availability records...
      </div>

      <!-- Empty State -->
      <div v-else-if="availabilityRecords.length === 0" class="text-center py-8 text-sm opacity-50 border-2 border-dashed p-6" :style="{ borderColor: primaryColor }">
        No availability records yet. 
        <br />
        Participants need to submit their availability first.
      </div>

      <!-- Availability Records List -->
      <div v-else class="space-y-3">
        <div
          v-for="record in availabilityRecords"
          :key="record.id"
          class="p-4 border-2 relative"
          :style="{ borderColor: primaryColor }"
        >
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex-1">
              <div class="font-bold uppercase text-sm mb-1">
                {{ getParticipantLabel(record) }}
              </div>
              <div class="text-xs font-mono opacity-60">
                ID: {{ record.user_id || record.guest_id || 'Unknown' }}
              </div>
              <div class="text-xs opacity-50 mt-1">
                Updated: {{ formatDate(record.updated_at || record.created_at) }}
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex gap-2">
              <button
                @click="handleEdit(record)"
                type="button"
                class="px-3 py-1 text-xs font-black uppercase border-2 hover:translate-x-1 hover:translate-y-1 transition-all"
                :style="{ 
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  color: 'rgba(0, 0, 0, 1)',
                  borderColor: 'rgba(5, 5, 5, 1)'
                }"
              >
                Edit
              </button>
              <button
                @click="handleDelete(record.id)"
                type="button"
                class="px-3 py-1 bg-red-500 text-black text-xs font-black uppercase border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Time Slots -->
          <div class="space-y-2 mt-3">
            <div class="text-xs font-bold uppercase opacity-70">Time Slots:</div>
            <div v-if="record.available_slots.length === 0" class="text-xs opacity-50 italic">
              No time slots
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="(slot, index) in record.available_slots"
                :key="index"
                class="text-xs font-mono p-2 bg-white/5 border"
                :style="{ borderColor: primaryColor + '40' }"
              >
                {{ formatDateTimeRange(slot.start, slot.end) }}
                <span class="opacity-60 ml-2">({{ formatDuration(slot.start, slot.end) }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Refresh Button -->
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

    <!-- Edit Modal -->
    <div
      v-if="editingRecord"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      @click.self="editingRecord = null"
    >
      <div
        class="bg-white border-4 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto text-black"
        :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
        @click.stop
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-black uppercase text-black">Edit Availability</h3>
          <button
            @click="editingRecord = null"
            class="text-2xl font-bold hover:opacity-50 transition-opacity text-black"
          >
            ×
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase mb-2 text-black">Participant</label>
            <div class="text-sm font-mono opacity-70 text-black">
              {{ getParticipantLabel(editingRecord) }}
            </div>
          </div>

          <!-- Time Slots Editor -->
          <div>
            <label class="block text-xs font-bold uppercase mb-2 text-black">Time Slots</label>
            <div class="space-y-3">
              <div
                v-for="(_, slotIndex) in editingSlots"
                :key="slotIndex"
                class="flex gap-2 items-center p-3 border-2"
                :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
              >
                <div class="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[9px] font-bold uppercase opacity-70 text-black">Start</label>
                    <input
                      v-model="editingSlots[slotIndex].start"
                      type="datetime-local"
                      class="w-full px-2 py-1 bg-white border text-xs font-mono text-black"
                      :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
                    />
                  </div>
                  <div>
                    <label class="text-[9px] font-bold uppercase opacity-70 text-black">End</label>
                    <input
                      v-model="editingSlots[slotIndex].end"
                      type="datetime-local"
                      class="w-full px-2 py-1 bg-white border text-xs font-mono text-black"
                      :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
                    />
                  </div>
                </div>
                <button
                  @click="removeEditingSlot(slotIndex)"
                  type="button"
                  class="px-2 py-1 bg-red-500 text-black text-xs font-black uppercase border-2 border-black"
                >
                  Remove
                </button>
              </div>
              
              <button
                @click="addEditingSlot"
                type="button"
                class="w-full px-3 py-2 text-xs font-bold uppercase border-2 border-dashed hover:border-solid transition-all text-black"
                :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
              >
                + Add Time Slot
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t-2" :style="{ borderColor: 'rgba(5, 5, 5, 1)' }">
            <button
              @click="editingRecord = null"
              type="button"
              class="px-4 py-2 text-xs font-bold uppercase border-2 hover:opacity-100 opacity-60 transition-opacity text-black"
              :style="{ borderColor: 'rgba(5, 5, 5, 1)' }"
            >
              Cancel
            </button>
            <button
              @click="handleSave"
              type="button"
              :disabled="isSaving"
              class="px-4 py-2 text-xs font-black uppercase border-2 transition-all hover:translate-x-1 hover:translate-y-1 disabled:opacity-50"
              :style="{ 
                backgroundColor: isSaving ? 'transparent' : 'rgba(255, 255, 255, 1)',
                color: 'rgba(0, 0, 0, 1)',
                borderColor: 'rgba(5, 5, 5, 1)'
              }"
            >
              {{ isSaving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import { differenceInHours, differenceInMinutes } from 'date-fns'
import type { UserAvailability, AvailabilitySlot } from '@/types/database'
import { fetchEventAvailabilities } from '../services'
import { supabase } from '@/lib/supabase'

const props = defineProps<{
  eventId: string
  primaryColor?: string
  isLight?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  updated: []
}>()

const loading = ref(true)
const availabilityRecords = ref<UserAvailability[]>([])
const editingRecord = ref<UserAvailability | null>(null)
const editingSlots = ref<Array<{ start: string; end: string }>>([])
const isSaving = ref(false)

// Guest identities cache
const guestIdentities = ref<Record<string, { display_name: string }>>({})

const loadRecords = async () => {
  loading.value = true
  try {
    availabilityRecords.value = await fetchEventAvailabilities(props.eventId)
    
    // Load guest identities for display names
    const guestIds = availabilityRecords.value
      .map(r => r.guest_id)
      .filter((id): id is string => !!id)
    
    if (guestIds.length > 0) {
      const { data: guests } = await supabase
        .from('guest_identities')
        .select('id, display_name')
        .in('id', guestIds)
      
      if (guests) {
        guests.forEach(guest => {
          guestIdentities.value[guest.id] = { display_name: guest.display_name }
        })
      }
    }
  } catch (err) {
    console.error('Error loading availability records:', err)
    alert(`加载失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    loading.value = false
  }
}

const getParticipantLabel = (record: UserAvailability) => {
  if (record.user_id) {
    return `User (${record.user_id.slice(0, 8)})`
  } else if (record.guest_id) {
    const guest = guestIdentities.value[record.guest_id]
    return guest 
      ? `Guest: ${guest.display_name}`
      : `Guest (${record.guest_id.slice(0, 8)})`
  }
  return 'Unknown'
}

const formatDate = (dateStr: string) => {
  return format(new Date(dateStr), 'MMM d, yyyy HH:mm')
}

const formatDateTimeRange = (startStr: string, endStr: string) => {
  const start = new Date(startStr)
  const end = new Date(endStr)
  
  const isSameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
  
  if (isSameDay) {
    return `${format(start, 'MMM d, yyyy HH:mm')} - ${format(end, 'HH:mm')}`
  } else {
    return `${format(start, 'MMM d, yyyy HH:mm')} - ${format(end, 'MMM d, yyyy HH:mm')}`
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

const handleEdit = (record: UserAvailability) => {
  editingRecord.value = record
  // Convert slots to local datetime format for editing
  editingSlots.value = record.available_slots.map(slot => ({
    start: new Date(slot.start).toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    end: new Date(slot.end).toISOString().slice(0, 16)
  }))
  
  // If no slots, add one empty slot
  if (editingSlots.value.length === 0) {
    editingSlots.value.push({
      start: new Date().toISOString().slice(0, 16),
      end: new Date(Date.now() + 3600000).toISOString().slice(0, 16) // +1 hour
    })
  }
}

const addEditingSlot = () => {
  const lastSlot = editingSlots.value[editingSlots.value.length - 1]
  const lastEnd = lastSlot ? new Date(lastSlot.end) : new Date()
  editingSlots.value.push({
    start: lastEnd.toISOString().slice(0, 16),
    end: new Date(lastEnd.getTime() + 3600000).toISOString().slice(0, 16) // +1 hour from last end
  })
}

const removeEditingSlot = (index: number) => {
  editingSlots.value.splice(index, 1)
}

const handleSave = async () => {
  if (!editingRecord.value) return

  isSaving.value = true
  try {
    // Convert editing slots back to ISO format
    const slots: AvailabilitySlot[] = editingSlots.value
      .filter(slot => slot.start && slot.end)
      .map(slot => ({
        start: new Date(slot.start).toISOString(),
        end: new Date(slot.end).toISOString()
      }))

    const { error } = await supabase
      .from('user_availability')
      .update({
        available_slots: slots,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingRecord.value.id)

    if (error) throw error

    editingRecord.value = null
    await loadRecords()
    emit('updated')
    alert('可用时间已更新！')
  } catch (err) {
    console.error('Error saving availability:', err)
    alert(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (recordId: string) => {
  if (!confirm('确定要删除这条可用时间记录吗？')) return

  try {
    const { error } = await supabase
      .from('user_availability')
      .delete()
      .eq('id', recordId)

    if (error) throw error

    await loadRecords()
    emit('updated')
    alert('记录已删除！')
  } catch (err) {
    console.error('Error deleting availability:', err)
    alert(`删除失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

onMounted(() => {
  loadRecords()
})

// Expose refresh method
defineExpose({
  refresh: loadRecords
})
</script>

