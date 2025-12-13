<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, profile } = useAuth()

const currentStep = ref(1)
const totalSteps = 5 // 总是 5 步，第三步内容根据 isDecideLater 动态变化

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
  primaryColor: '#FF8A95', // Coral Pink
  bgColor: '#000000',
  effects: [] as string[]
})

// 主题预设配置（带图标）
const themePresets: Record<string, typeof theme.value & { icon: string; name: string }> = {
  'default': {
    preset: 'default',
    font: 'Inter',
    primaryColor: '#FF8A95', // Coral Pink
    bgColor: '#000000', // Black
    effects: [],
    icon: 'material-symbols:palette',
    name: 'Default'
  },
  'neon-nights': {
    preset: 'neon-nights',
    font: 'Inter',
    primaryColor: '#00FFFF', // Cyan
    bgColor: '#1A0B2E', // Deep Purple
    effects: ['glow'],
    icon: 'solar:lightbulb-bold-duotone',
    name: 'Neon Nights'
  },
  'retro-paper': {
    preset: 'retro-paper',
    font: 'Chonburi',
    primaryColor: '#FF4D00', // Orange
    bgColor: '#F0EAD6', // Eggshell/Beige
    effects: ['noise'],
    icon: 'material-symbols:description',
    name: 'Retro Paper'
  },
  'y2k-glitch': {
    preset: 'y2k-glitch',
    font: 'monospace',
    primaryColor: '#00FF00', // Matrix Green
    bgColor: '#000000',
    effects: ['glitch'],
    icon: 'material-symbols:shuffle',
    name: 'Y2K Glitch'
  }
}

// 监听预设变化，自动应用样式
watch(() => theme.value.preset, (newPreset) => {
  if (themePresets[newPreset]) {
    const p = themePresets[newPreset]
    theme.value.primaryColor = p.primaryColor
    theme.value.bgColor = p.bgColor
    theme.value.font = p.font
    theme.value.effects = p.effects
  }
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
  <div class="min-h-screen bg-black text-white relative overflow-hidden selection:bg-coral-pink selection:text-black">
    <!-- 背景网格装饰 -->
    <div class="absolute inset-0 pointer-events-none" 
         style="background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px;">
    </div>
    
    <!-- 顶部技术参数装饰 -->
    <div class="absolute top-0 left-0 w-full h-8 border-b border-white/20 flex items-center justify-between px-4 text-[10px] font-mono opacity-50 uppercase">
      <span>SYS.TACIT.V1</span>
      <span>COORDINATES: {{ currentStep }}/{{ totalSteps }}</span>
      <span>MODE: WIZARD</span>
    </div>

    <div class="container mx-auto px-4 py-16 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
        <!-- 左侧：填空句式表单 -->
        <div class="space-y-10">
          <!-- 进度指示器 (工业风格) -->
          <div class="space-y-2">
            <div class="flex justify-between text-xs font-mono tracking-widest opacity-70 uppercase">
              <span>Sequence 0{{ currentStep }}</span>
              <span>Total 0{{ totalSteps }}</span>
            </div>
            <div class="flex gap-1">
              <div 
                v-for="step in totalSteps" 
                :key="step"
                class="flex-1 h-1 bg-white/10 transition-all duration-300"
                :class="{ 'bg-coral-pink shadow-[0_0_10px_rgba(255,138,149,0.5)]': step <= currentStep }"
              ></div>
            </div>
          </div>

          <!-- Step 1: Basic Info -->
          <div v-show="currentStep === 1" class="space-y-6 animate-fade-in">
            <div class="border-2 border-white/20 bg-black/50 p-8 relative backdrop-blur-sm group hover:border-coral-pink/50 transition-colors duration-300">
              <!-- 角标装饰 -->
              <div class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white"></div>
              <div class="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-white"></div>
              <div class="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-white"></div>
              <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white"></div>

              <h2 class="text-xs font-mono text-coral-pink mb-6 uppercase tracking-[0.2em]">/// 01. Initial Data</h2>
              
              <div class="text-3xl md:text-4xl font-black mb-10 leading-relaxed font-heading">
                {{ sentence }}
                <span class="inline-block w-3 h-8 bg-coral-pink animate-pulse ml-1 align-middle"></span>
              </div>

              <div class="space-y-8">
                <div class="relative">
                  <label class="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-coral-pink uppercase tracking-wider">Event Name</label>
                  <input
                    v-model="eventTitle"
                    type="text"
                    required
                    class="w-full px-6 py-5 bg-transparent border-2 border-white/30 text-white focus:outline-none focus:border-coral-pink transition-colors font-bold text-lg rounded-none"
                    placeholder="ENTER TITLE..."
                  />
                </div>

                <div class="relative">
                  <label class="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-coral-pink uppercase tracking-wider">Manifesto</label>
                  <textarea
                    v-model="eventDescription"
                    rows="4"
                    class="w-full px-6 py-5 bg-transparent border-2 border-white/30 text-white focus:outline-none focus:border-coral-pink transition-colors font-bold rounded-none resize-none"
                    placeholder="DESCRIBE THE VIBE..."
                  ></textarea>
                </div>

                <div class="p-4 border border-white/10 bg-white/5">
                  <label class="flex items-center gap-4 cursor-pointer">
                    <div class="relative">
                      <input
                        v-model="isDecideLater"
                        type="checkbox"
                        class="peer sr-only"
                      />
                      <div class="w-12 h-6 bg-white/20 rounded-full peer-checked:bg-coral-pink transition-colors"></div>
                      <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                    </div>
                    <span class="font-mono text-sm tracking-wider uppercase">Decide Date Later (Polling Mode)</span>
                  </label>
                </div>

                <div v-if="!isDecideLater" class="relative">
                  <label class="absolute -top-3 left-4 bg-black px-2 text-xs font-bold text-coral-pink uppercase tracking-wider">Target Date</label>
                  <input
                    v-model="eventDate"
                    type="date"
                    required
                    class="w-full px-6 py-5 bg-transparent border-2 border-white/30 text-white focus:outline-none focus:border-coral-pink transition-colors font-bold rounded-none"
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
                    <span class="iconify text-xl" data-icon="mdi:spotify"></span>
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
                    <span class="iconify text-xl" data-icon="material-symbols:card-giftcard"></span>
                    <span class="font-bold uppercase text-sm tracking-wider">Gift Registry</span>
                  </label>
                  <div v-if="modules.giftRegistry.enabled" class="space-y-3">
                    <div
                      v-for="(_, index) in modules.giftRegistry.items"
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
                    <span class="iconify text-xl" data-icon="material-symbols:checkroom"></span>
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
                    <span class="iconify text-xl" data-icon="material-symbols:payments"></span>
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
                  <label class="block font-bold mb-4 uppercase text-sm tracking-wider">Theme Preset</label>
                  
                  <!-- 主题卡片选择器 -->
                  <div class="grid grid-cols-2 gap-4">
                    <button
                      v-for="(preset, key) in themePresets"
                      :key="key"
                      @click="theme.preset = key"
                      type="button"
                      class="relative p-6 border-4 transition-all group hover:scale-105"
                      :class="theme.preset === key ? 'border-coral-pink bg-white/10' : 'border-white/30 bg-black/50 hover:border-white/60'"
                    >
                      <!-- 选中指示器 -->
                      <div v-if="theme.preset === key" class="absolute -top-2 -right-2 w-6 h-6 bg-coral-pink border-2 border-black flex items-center justify-center">
                        <span class="iconify text-black text-lg" data-icon="material-symbols:check"></span>
                      </div>
                      
                      <!-- 图标 (使用 Iconify CDN) -->
                      <div class="mb-4 flex justify-center">
                        <span 
                          class="iconify text-4xl transition-transform group-hover:scale-110 inline-block"
                          :data-icon="preset.icon"
                          :style="{ color: theme.preset === key ? preset.primaryColor : 'rgba(255,255,255,0.7)' }"
                        ></span>
                      </div>
                      
                      <!-- 名称 -->
                      <div class="text-center">
                        <div class="font-black uppercase text-sm tracking-wider mb-2">{{ preset.name }}</div>
                        <div class="h-1 w-full" :style="{ backgroundColor: preset.primaryColor }"></div>
                      </div>
                      
                      <!-- 预览颜色 -->
                      <div class="mt-3 flex gap-1 justify-center">
                        <div 
                          class="w-4 h-4 border border-white/20" 
                          :style="{ backgroundColor: preset.primaryColor }"
                        ></div>
                        <div 
                          class="w-4 h-4 border border-white/20" 
                          :style="{ backgroundColor: preset.bgColor }"
                        ></div>
                      </div>
                    </button>
                  </div>
                  
                  <!-- 隐藏的下拉框（用于表单提交） -->
                  <select
                    v-model="theme.preset"
                    class="hidden"
                  >
                    <option v-for="(preset, key) in themePresets" :key="key" :value="key">
                      {{ preset.name }}
                    </option>
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
        <div class="lg:sticky lg:top-8 h-fit">
          <div class="relative">
            <!-- 预览框装饰 -->
            <div class="absolute -inset-2 bg-gradient-to-br from-coral-pink to-purple-600 opacity-20 blur-xl"></div>
            
            <div class="border-2 border-white/20 bg-black p-4 relative">
              <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 class="text-xs font-mono text-white/50 uppercase tracking-widest">DEVICE PREVIEW</h3>
                <div class="flex gap-1">
                  <div class="w-2 h-2 rounded-full bg-red-500"></div>
                  <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div class="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
              </div>

              <!-- 手机屏幕 -->
              <div class="aspect-[9/19] bg-white rounded-3xl overflow-hidden relative shadow-2xl transition-all duration-500"
                   :style="{ 
                     backgroundColor: theme.bgColor, 
                     color: theme.primaryColor,
                     fontFamily: theme.font
                   }">
                
                <!-- 动态背景特效 -->
                <div v-if="theme.preset === 'retro-paper'" class="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply"
                     style="background-image: url('https://www.transparenttextures.com/patterns/cream-paper.png');"></div>
                <div v-if="theme.preset === 'y2k-glitch'" class="absolute inset-0 opacity-10 pointer-events-none"
                     style="background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 2px, #00ff00 4px);"></div>
                
                <!-- 内容区域 -->
                <div class="h-full overflow-y-auto p-6 scrollbar-hide">
                  <div class="min-h-full flex flex-col items-center justify-center text-center">
                    
                    <!-- 标题 -->
                    <div class="mb-8 relative group">
                      <h2 class="text-3xl font-black mb-3 leading-tight uppercase" 
                          :class="{ 'tracking-tighter': theme.preset === 'default', 'tracking-widest': theme.preset === 'neon-nights' }">
                        {{ eventTitle || 'UNTITLED EVENT' }}
                      </h2>
                      <div class="h-1 w-12 bg-current mx-auto opacity-50"></div>
                    </div>

                    <!-- 描述 -->
                    <p class="text-sm opacity-80 mb-8 max-w-[80%] leading-relaxed">
                      {{ eventDescription || 'No description provided.' }}
                    </p>

                    <!-- 信息卡片 -->
                    <div class="w-full space-y-4 text-sm border-t border-current/20 pt-6">
                      <!-- 日期 -->
                      <div class="flex flex-col items-center gap-1">
                        <div v-if="!isDecideLater && eventDate">
                          <p class="font-bold text-lg">{{ new Date(eventDate).toLocaleDateString() }}</p>
                          <p v-if="startTime" class="text-xs opacity-70">{{ startTime }}</p>
                        </div>
                        <div v-else class="px-3 py-1 border border-current rounded-full text-xs font-bold uppercase">
                          Date Pending
                        </div>
                      </div>

                      <!-- 地点 -->
                      <div v-if="locationName" class="pt-4">
                        <p class="font-bold uppercase tracking-wider">{{ locationName }}</p>
                        <p class="text-xs opacity-60">{{ locationAddress }}</p>
                      </div>

                      <!-- 模块展示 (Compact) -->
                      <div class="grid grid-cols-2 gap-2 mt-4 w-full">
                        <div v-if="modules.spotify.enabled" class="border border-current/30 p-2 flex flex-col items-center justify-center aspect-square">
                          <span class="iconify text-2xl" data-icon="mdi:spotify"></span>
                          <span class="text-[10px] mt-1 uppercase">Spotify</span>
                        </div>
                        <div v-if="modules.giftRegistry.enabled && modules.giftRegistry.items.length > 0" class="border border-current/30 p-2 flex flex-col items-center justify-center aspect-square">
                          <span class="iconify text-2xl" data-icon="material-symbols:card-giftcard"></span>
                          <span class="text-[10px] mt-1 uppercase">{{ modules.giftRegistry.items.length }} items</span>
                        </div>
                        <div v-if="modules.dressCode.enabled" class="border border-current/30 p-2 flex flex-col items-center justify-center aspect-square">
                          <span class="iconify text-2xl" data-icon="material-symbols:checkroom"></span>
                          <span class="text-[10px] mt-1 uppercase">Dress</span>
                        </div>
                        <div v-if="modules.chipIn.enabled" class="border border-current/30 p-2 flex flex-col items-center justify-center aspect-square">
                          <span class="iconify text-2xl" data-icon="material-symbols:payments"></span>
                          <span class="text-[10px] mt-1 uppercase">{{ modules.chipIn.amount }} {{ modules.chipIn.currency }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 底部条 -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-current rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

