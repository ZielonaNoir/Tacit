<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import type { TacitEvent } from '@/types/database'

const router = useRouter()
const { user, profile } = useAuth()

const currentStep = ref(1)
const totalSteps = 5 // 总是 5 步，第三步内容根据 isDecideLater 动态变化

// 获取实际的步骤编号（用于显示）
const getDisplayStep = (step: number) => {
  if (!isDecideLater.value && step >= 3) {
    return step + 1 // 跳过第三步，后面的步骤编号+1
  }
  return step
}

// Step 1: Basic Info (填空句式)
const eventTitle = ref('')
const eventDescription = ref('')
const eventDate = ref<Date | null>(null)
const isDecideLater = ref(false)

// Step 2: Time & Location
const startTime = ref('')
const endTime = ref('')
const timezone = ref('Asia/Shanghai')
const locationName = ref('')
const locationAddress = ref('')
const locationUrl = ref('')
const useSecretAddress = ref(false)
const maxCapacity = ref<number | null>(null)

// Step 3: Time Polling
const timeSlots = ref<{ start: string; end: string }[]>([])

// Step 4: Modules
const modules = ref({
  spotify: { enabled: false, url: '' },
  giftRegistry: { enabled: false, items: [] as string[] },
  dressCode: { enabled: false, text: '' },
  chipIn: { enabled: false, amount: 0, currency: 'USD' }
})

// Step 5: Theme & Privacy
const theme = ref({
  preset: 'default',
  font: 'Inter',
  primaryColor: '#FF4D00',
  bgColor: '#FFFFFF',
  effects: [] as string[]
})
const privacy = ref({
  approvalRequired: false,
  showGuestList: true
})

const loading = ref(false)

const sentence = computed(() => {
  const name = profile.value?.full_name || profile.value?.username || '你'
  const title = eventTitle.value || '[活动名称]'
  const date = isDecideLater.value 
    ? '待定' 
    : eventDate.value 
      ? new Date(eventDate.value).toLocaleDateString('zh-CN') 
      : '[日期]'
  return `${name} is hosting ${title} on ${date}`
})

const addTimeSlot = () => {
  timeSlots.value.push({ start: '', end: '' })
}

const removeTimeSlot = (index: number) => {
  timeSlots.value.splice(index, 1)
}

const addGiftItem = () => {
  modules.value.giftRegistry.items.push('')
}

const removeGiftItem = (index: number) => {
  modules.value.giftRegistry.items.splice(index, 1)
}

const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const createEvent = async () => {
  if (!eventTitle.value.trim()) {
    alert('请输入活动名称')
    return
  }

  if (!user.value) {
    router.push({ name: 'login', query: { redirect: '/events/create' } })
    return
  }

  loading.value = true
  try {
    // 确保 profile 存在
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.value.id)
      .maybeSingle()

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.value.id,
          full_name: user.value.user_metadata?.full_name || null,
          username: user.value.user_metadata?.username || null
        })
      
      if (profileError) {
        alert('无法创建用户资料，请重试')
        return
      }
    }

    // 准备活动数据
    const eventData = {
      creator_id: user.value.id,
      title: eventTitle.value,
      description: eventDescription.value || null,
      status: isDecideLater.value ? 'polling' : 'draft',
      start_time: isDecideLater.value || !eventDate.value ? null : new Date(`${eventDate.value}T${startTime.value}`).toISOString(),
      end_time: isDecideLater.value || !eventDate.value ? null : new Date(`${eventDate.value}T${endTime.value}`).toISOString(),
      timezone: timezone.value,
      location_name: useSecretAddress.value ? null : locationName.value || null,
      location_address: useSecretAddress.value ? null : locationAddress.value || null,
      location_url: locationUrl.value || null,
      theme_config: {
        preset: theme.value.preset,
        font: theme.value.font,
        primary_color: theme.value.primaryColor,
        bg_color: theme.value.bgColor,
        effects: theme.value.effects
      },
      modules_config: {
        spotify: modules.value.spotify.enabled ? { url: modules.value.spotify.url } : null,
        gift_registry: modules.value.giftRegistry.enabled ? { items: modules.value.giftRegistry.items } : null,
        dress_code: modules.value.dressCode.enabled ? { text: modules.value.dressCode.text } : null,
        chip_in: modules.value.chipIn.enabled ? {
          amount: modules.value.chipIn.amount,
          currency: modules.value.chipIn.currency
        } : null,
        secret_address: useSecretAddress.value ? locationAddress.value : null
      },
      max_capacity: maxCapacity.value || null,
      show_guest_list: privacy.value.showGuestList
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()

    if (error) throw error

    // 如果有时间投票选项，创建它们
    if (isDecideLater.value && timeSlots.value.length > 0) {
      const pollData = timeSlots.value
        .filter(slot => slot.start && slot.end)
        .map(slot => ({
          event_id: event.id,
          start_time: new Date(slot.start).toISOString(),
          end_time: new Date(slot.end).toISOString()
        }))

      if (pollData.length > 0) {
        await supabase
          .from('event_time_polls')
          .insert(pollData)
      }
    }

    router.push(`/events/${event.id}`)
  } catch (err: any) {
    console.error('Error creating event:', err)
    alert(err.message || '创建活动失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black text-white">
    <div class="container mx-auto px-4 py-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
        <!-- 左侧：填空句式表单 -->
        <div class="space-y-8">
          <!-- 进度指示 -->
          <div class="flex items-center gap-4">
            <div 
              v-for="step in totalSteps" 
              :key="step"
              class="flex-1 h-2 bg-white/20 rounded"
            >
              <div 
                class="h-full bg-coral-pink transition-all"
                :style="{ width: step <= currentStep ? '100%' : '0%' }"
              ></div>
            </div>
            <span class="text-sm font-bold">{{ currentStep }}/{{ totalSteps }}</span>
          </div>

          <!-- Step 1: Basic Info -->
          <div v-show="currentStep === 1" class="space-y-6">
            <div class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">Fill in the Blanks</h2>
              
              <div class="text-4xl font-bold mb-8 leading-relaxed border-b-4 border-white pb-6">
                {{ sentence }}
              </div>

              <div class="space-y-6">
                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Event Name *</label>
                  <input
                    v-model="eventTitle"
                    type="text"
                    required
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="周末聚餐"
                  />
                </div>

                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Description</label>
                  <textarea
                    v-model="eventDescription"
                    rows="4"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold resize-none"
                    placeholder="描述你的活动..."
                  ></textarea>
                </div>

                <div>
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input
                      v-model="isDecideLater"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Decide Date Later (Use Polling)</span>
                  </label>
                </div>

                <div v-if="!isDecideLater">
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Date *</label>
                  <input
                    v-model="eventDate"
                    type="date"
                    required
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Time & Location -->
          <div v-show="currentStep === 2" class="space-y-6">
            <div class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">When & Where</h2>
              
              <div v-if="!isDecideLater" class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Start Time</label>
                    <input
                      v-model="startTime"
                      type="time"
                      class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                    />
                  </div>
                  <div>
                    <label class="block font-bold mb-3 uppercase text-sm tracking-wider">End Time</label>
                    <input
                      v-model="endTime"
                      type="time"
                      class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                    />
                  </div>
                </div>
              </div>

              <div class="space-y-6">
                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Location Name</label>
                  <input
                    v-model="locationName"
                    type="text"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="咖啡店"
                  />
                </div>

                <div>
                  <label class="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                      v-model="useSecretAddress"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Secret Address (Only visible to RSVP'd guests)</span>
                  </label>
                </div>

                <div v-if="!useSecretAddress || true">
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Address</label>
                  <input
                    v-model="locationAddress"
                    type="text"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="详细地址"
                  />
                </div>

                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Location URL (Optional)</label>
                  <input
                    v-model="locationUrl"
                    type="url"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Time Polling (if decide later) or Additional Info -->
          <div v-show="currentStep === 3" class="space-y-6">
            <!-- Time Polling (if decide later) -->
            <div v-if="isDecideLater">
            <div class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">Time Options</h2>
              
              <div class="space-y-4">
                <div
                  v-for="(slot, index) in timeSlots"
                  :key="index"
                  class="grid grid-cols-2 gap-4 p-4 border-4 border-white"
                >
                  <div>
                    <label class="block font-bold mb-2 uppercase text-xs tracking-wider">Start</label>
                    <input
                      v-model="slot.start"
                      type="datetime-local"
                      class="w-full px-4 py-3 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label class="block font-bold mb-2 uppercase text-xs tracking-wider">End</label>
                    <input
                      v-model="slot.end"
                      type="datetime-local"
                      class="w-full px-4 py-3 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold text-sm"
                    />
                  </div>
                  <button
                    @click="removeTimeSlot(index)"
                    type="button"
                    class="col-span-2 px-4 py-2 bg-red-600 text-white font-bold border-4 border-black hover:translate-x-1 hover:translate-y-1 transition-all uppercase text-sm"
                  >
                    Remove
                  </button>
                </div>

                <button
                  @click="addTimeSlot"
                  type="button"
                  class="w-full px-6 py-4 bg-coral-pink text-black font-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
                >
                  + Add Time Slot
                </button>
              </div>
            </div>
            </div>
            
            <!-- Additional Info (if specific date) -->
            <div v-else class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">Additional Information</h2>
              
              <div class="space-y-6">
                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Timezone</label>
                  <select
                    v-model="timezone"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Max Capacity (Optional)</label>
                  <input
                    v-model.number="maxCapacity"
                    type="number"
                    min="0"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Modules -->
          <div v-show="currentStep === 4" class="space-y-6">
            <div class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">Add-On Modules</h2>
              
              <div class="space-y-6">
                <!-- Spotify -->
                <div class="border-4 border-white p-4">
                  <label class="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      v-model="modules.spotify.enabled"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Spotify Playlist</span>
                  </label>
                  <input
                    v-if="modules.spotify.enabled"
                    v-model="modules.spotify.url"
                    type="url"
                    class="w-full px-4 py-3 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                    placeholder="https://open.spotify.com/playlist/..."
                  />
                </div>

                <!-- Gift Registry -->
                <div class="border-4 border-white p-4">
                  <label class="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      v-model="modules.giftRegistry.enabled"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Gift Registry</span>
                  </label>
                  <div v-if="modules.giftRegistry.enabled" class="space-y-3">
                    <div
                      v-for="(item, index) in modules.giftRegistry.items"
                      :key="index"
                      class="flex gap-2"
                    >
                      <input
                        v-model="modules.giftRegistry.items[index]"
                        type="url"
                        class="flex-1 px-4 py-3 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                        placeholder="Amazon/Wishlist URL"
                      />
                      <button
                        @click="removeGiftItem(index)"
                        type="button"
                        class="px-4 py-3 bg-red-600 text-white font-bold border-4 border-black"
                      >
                        ×
                      </button>
                    </div>
                    <button
                      @click="addGiftItem"
                      type="button"
                      class="px-4 py-2 bg-coral-pink text-black font-bold border-4 border-black uppercase text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                <!-- Dress Code -->
                <div class="border-4 border-white p-4">
                  <label class="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      v-model="modules.dressCode.enabled"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Dress Code</span>
                  </label>
                  <textarea
                    v-if="modules.dressCode.enabled"
                    v-model="modules.dressCode.text"
                    rows="3"
                    class="w-full px-4 py-3 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold resize-none"
                    placeholder="Casual, Formal, etc."
                  ></textarea>
                </div>

                <!-- Chip In -->
                <div class="border-4 border-white p-4">
                  <label class="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      v-model="modules.chipIn.enabled"
                      type="checkbox"
                      class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                    />
                    <span class="font-bold uppercase text-sm tracking-wider">Chip In (Payment Required)</span>
                  </label>
                  <div v-if="modules.chipIn.enabled" class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block font-bold mb-2 uppercase text-xs tracking-wider">Amount</label>
                      <input
                        v-model.number="modules.chipIn.amount"
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-full px-4 py-3 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                      />
                    </div>
                    <div>
                      <label class="block font-bold mb-2 uppercase text-xs tracking-wider">Currency</label>
                      <select
                        v-model="modules.chipIn.currency"
                        class="w-full px-4 py-3 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                      >
                        <option value="USD">USD</option>
                        <option value="CNY">CNY</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: Theme & Privacy -->
          <div v-show="currentStep === 5" class="space-y-6">
            <div class="border-4 border-coral-pink p-8 bg-black">
              <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">Theme & Privacy</h2>
              
              <div class="space-y-6">
                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Theme Preset</label>
                  <select
                    v-model="theme.preset"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                  >
                    <option value="default">Default</option>
                    <option value="neon-nights">Neon Nights</option>
                    <option value="retro-paper">Retro Paper</option>
                    <option value="y2k-glitch">Y2K Glitch</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Primary Color</label>
                    <input
                      v-model="theme.primaryColor"
                      type="color"
                      class="w-full h-16 border-4 border-white bg-black cursor-pointer"
                    />
                  </div>
                  <div>
                    <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Background Color</label>
                    <input
                      v-model="theme.bgColor"
                      type="color"
                      class="w-full h-16 border-4 border-white bg-black cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Privacy Settings</label>
                  <div class="space-y-3">
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        v-model="privacy.showGuestList"
                        type="checkbox"
                        class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                      />
                      <span class="font-bold uppercase text-sm tracking-wider">Show Guest List</span>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        v-model="privacy.approvalRequired"
                        type="checkbox"
                        class="w-6 h-6 border-4 border-white bg-black text-coral-pink focus:ring-coral-pink"
                      />
                      <span class="font-bold uppercase text-sm tracking-wider">Require Approval for RSVP</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="flex gap-4">
            <button
              v-if="currentStep > 1"
              @click="prevStep"
              type="button"
              class="px-6 py-4 bg-white text-black font-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
            >
              ← Back
            </button>
            <button
              v-if="currentStep < totalSteps"
              @click="nextStep"
              type="button"
              class="flex-1 px-6 py-4 bg-coral-pink text-black font-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase"
            >
              Next →
            </button>
            <button
              v-if="currentStep === totalSteps"
              @click="createEvent"
              :disabled="loading"
              type="button"
              class="flex-1 px-6 py-4 bg-coral-pink text-black font-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Creating...' : 'Create Event' }}
            </button>
          </div>
        </div>

        <!-- 右侧：手机预览 -->
        <div class="lg:sticky lg:top-12 h-fit">
          <div class="border-4 border-coral-pink p-8 bg-black">
            <h3 class="text-2xl font-black mb-6 uppercase tracking-wider text-center">Preview</h3>
            <div class="bg-white rounded-3xl p-6 shadow-[20px_20px_0_0_#FF8A95]">
              <div class="aspect-[9/16] bg-gray-100 rounded-2xl p-6 overflow-y-auto" :style="{ backgroundColor: theme.bgColor, color: theme.primaryColor }">
                <div class="text-center mb-6">
                  <h2 class="text-2xl font-bold mb-2">{{ eventTitle || 'Event Name' }}</h2>
                  <p class="text-sm opacity-80">{{ eventDescription || 'Event description...' }}</p>
                </div>
                <div class="space-y-4">
                  <div v-if="!isDecideLater && eventDate" class="text-center">
                    <p class="font-bold">{{ new Date(eventDate).toLocaleDateString() }}</p>
                  </div>
                  <div v-if="locationName" class="text-center">
                    <p class="font-semibold">📍 {{ locationName }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

