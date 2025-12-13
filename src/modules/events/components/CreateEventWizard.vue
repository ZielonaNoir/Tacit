<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { availableFonts } from '@/lib/fonts'
import { useDark } from '@vueuse/core'
import { fetchEvent, updateEvent, fetchEventPolls, deleteEventPolls } from '../services'

const props = defineProps<{
  eventId?: string
}>()

const isEditMode = computed(() => !!props.eventId)
const isDark = useDark()

// 底部配置栏状态
const activeConfigTab = ref<'theme' | 'color' | 'font' | 'appearance' | null>(null)
const showConfigPanel = ref(false)

const openConfig = (tab: 'theme' | 'color' | 'font' | 'appearance') => {
  if (activeConfigTab.value === tab && showConfigPanel.value) {
    showConfigPanel.value = false
    activeConfigTab.value = null
  } else {
    activeConfigTab.value = tab
    showConfigPanel.value = true
  }
}

// 预设颜色
const presetColors = [
  '#FF8A95', '#FF4D00', '#B829E3', '#295CE3', '#00FFFF', '#00FF00', '#FFD700', '#FFFFFF'
]

const router = useRouter()
const { user, profile } = useAuth()

const currentStep = ref(1)
const totalSteps = 5 // 总是 5 步，第三步内容根据 isDecideLater 动态变化

// Step 1: Basic Info (填空句式)
const eventTitle = ref('')
const eventDescription = ref('')
const eventDate = ref<Date | null>(null)
const isDecideLater = ref(false)
const timeMode = ref<'fixed' | 'polling' | null>(null) // 新增：两个入口

// 投票模式：调研截止时间
const pollDeadline = ref<string>('') // ISO 格式日期时间

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
    font: 'Orbitron', // 未来科技感字体
    primaryColor: '#00FFFF', // Cyan
    bgColor: '#1A0B2E', // Deep Purple
    effects: ['glow'],
    icon: 'solar:lightbulb-bold-duotone',
    name: 'Neon Nights'
  },
  'retro-paper': {
    preset: 'retro-paper',
    font: 'Chonburi', // 装饰性字体
    primaryColor: '#FF4D00', // Orange
    bgColor: '#F0EAD6', // Eggshell/Beige
    effects: ['noise'],
    icon: 'material-symbols:description',
    name: 'Retro Paper'
  },
  'y2k-glitch': {
    preset: 'y2k-glitch',
    font: 'JetBrains Mono', // 等宽编程字体
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

onMounted(async () => {
  if (isEditMode.value && props.eventId) {
    loading.value = true
    try {
      const event = await fetchEvent(props.eventId)
      
      // Populate fields
      eventTitle.value = event.title
      eventDescription.value = event.description || ''
      
      // Date handling
      if (event.status === 'polling') {
        isDecideLater.value = true
        timeMode.value = 'polling'
        // Load poll deadline
        if (event.poll_deadline) {
          const deadline = new Date(event.poll_deadline)
          pollDeadline.value = toLocalISOString(deadline).slice(0, 16)
        }
        // Fetch polls if polling
        const polls = await fetchEventPolls(props.eventId)
        if (polls.length > 0) {
           timeSlots.value = polls.map(p => ({
             // Convert UTC to local datetime-local format (YYYY-MM-DDTHH:mm)
             // Simple hack: new Date(p.start_time).toISOString().slice(0, 16) gives UTC. 
             // We need local.
             start: toLocalISOString(new Date(p.start_time)).slice(0, 16),
             end: p.end_time ? toLocalISOString(new Date(p.end_time)).slice(0, 16) : ''
           }))
        }
      } else if (event.start_time) {
        isDecideLater.value = false
        timeMode.value = 'fixed'
        const startD = new Date(event.start_time)
        // YYYY-MM-DD
        const year = startD.getFullYear()
        const month = String(startD.getMonth() + 1).padStart(2, '0')
        const day = String(startD.getDate()).padStart(2, '0')
        eventDate.value = `${year}-${month}-${day}` as any
        
        // HH:mm
        startTime.value = startD.toTimeString().slice(0, 5)
        if (event.end_time) {
          endTime.value = new Date(event.end_time).toTimeString().slice(0, 5)
        }
      }

      // Location
      timezone.value = event.timezone
      locationName.value = event.location_name || ''
      locationAddress.value = event.location_address || ''
      locationUrl.value = event.location_url || ''
      useSecretAddress.value = !!event.modules_config?.secret_address
      maxCapacity.value = event.max_capacity

      // Modules
      if (event.modules_config) {
        if (event.modules_config.spotify) {
          modules.value.spotify = { enabled: true, url: event.modules_config.spotify.url }
        }
        if (event.modules_config.gift_registry) {
           modules.value.giftRegistry = { enabled: true, items: event.modules_config.gift_registry.items || [] }
        }
        if (event.modules_config.dress_code) {
           modules.value.dressCode = { enabled: true, text: event.modules_config.dress_code.text || '' }
        }
        if (event.modules_config.chip_in) {
           modules.value.chipIn = { enabled: true, amount: event.modules_config.chip_in.amount, currency: event.modules_config.chip_in.currency }
        }
      }

      // Theme
      if (event.theme_config) {
         // Don't trigger watcher automatically or handle it carefully
         // Watcher triggers on preset change.
         theme.value.preset = event.theme_config.preset || 'default'
         // Wait for next tick or manually override after preset change
         setTimeout(() => {
            if (event.theme_config.font) theme.value.font = event.theme_config.font
            if (event.theme_config.primary_color) theme.value.primaryColor = event.theme_config.primary_color
            if (event.theme_config.bg_color) theme.value.bgColor = event.theme_config.bg_color
            if (event.theme_config.effects) theme.value.effects = event.theme_config.effects
         }, 100)
      }
      
      // Privacy
      privacy.value.showGuestList = event.show_guest_list
      privacy.value.approvalRequired = event.approval_required || false
      // Assuming it might be missing or stored in modules/theme? 
      // Whatever, ignore for now or add to schema later.
      
    } catch (err) {
      console.error('Failed to load event for editing', err)
      alert('无法加载活动信息')
      router.push('/')
    } finally {
      loading.value = false
    }
  }
})

// Helper for local ISO string
function toLocalISOString(date: Date) {
  const offset = date.getTimezoneOffset() * 60000 // offset in milliseconds
  const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, -1)
  return localISOTime
}

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
  // Step 1 验证：必须选择时间模式
  if (currentStep.value === 1) {
    if (timeMode.value === null) {
      alert('Please select a time mode (Fixed Time or Find Time)')
      return
    }
    if (timeMode.value === 'fixed' && !eventDate.value) {
      alert('Please select a date for fixed time mode')
      return
    }
  }
  
  // Step 2 验证：投票模式必须设置截止时间
  if (currentStep.value === 2 && timeMode.value === 'polling') {
    if (!pollDeadline.value) {
      alert('Please set a poll deadline for Find Time mode')
      return
    }
    const deadline = new Date(pollDeadline.value)
    if (deadline <= new Date()) {
      alert('Poll deadline must be in the future')
      return
    }
  }

  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSave = async () => {
  if (!eventTitle.value.trim()) {
    alert('请输入活动名称')
    return
  }

  if (!user.value) {
    const redirect = isEditMode.value ? `/events/${props.eventId}/edit` : '/events/create'
    router.push({ name: 'login', query: { redirect } })
    return
  }

  loading.value = true
  try {
    // 准备活动数据
    const eventData = {
      creator_id: user.value.id,
      title: eventTitle.value,
      description: eventDescription.value || null,
      status: isDecideLater.value ? 'polling' : 'scheduled', // 投票模式为 polling，固定时间为 scheduled
      start_time: isDecideLater.value || !eventDate.value ? null : new Date(`${eventDate.value}T${startTime.value}`).toISOString(),
      end_time: isDecideLater.value || !eventDate.value ? null : new Date(`${eventDate.value}T${endTime.value}`).toISOString(),
      timezone: timezone.value,
      poll_deadline: isDecideLater.value && pollDeadline.value ? new Date(pollDeadline.value).toISOString() : null, // 调研截止时间
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
      show_guest_list: privacy.value.showGuestList,
      approval_required: privacy.value.approvalRequired || false
    }

    let savedEventId = ''

    if (isEditMode.value && props.eventId) {
      // --- Update Logic ---
      const { creator_id, ...updates } = eventData
      
      // Explicit status update
      if (isDecideLater.value) {
          (updates as any).status = 'polling'
      } else {
          (updates as any).status = 'scheduled'
      }

      await updateEvent(props.eventId, updates as any)
      savedEventId = props.eventId

      // Handle Polls (Full Replace)
      // Always delete old polls first, regardless of current mode
      try {
        const deleteResult = await deleteEventPolls(savedEventId)
        console.log('[CreateEventWizard] Deleted polls:', deleteResult)
      } catch (error) {
        console.error('[CreateEventWizard] Error deleting polls:', error)
        // Continue anyway - might be RLS issue, but we'll try to insert
        throw new Error(`无法删除旧的时间选项: ${error instanceof Error ? error.message : String(error)}`)
      }
      
      // Only insert new polls if in polling mode
      if (isDecideLater.value && timeSlots.value.length > 0) {
        const pollData = timeSlots.value
          .filter(slot => slot.start && slot.end)
          .map(slot => ({
            event_id: savedEventId,
            start_time: new Date(slot.start).toISOString(),
            end_time: new Date(slot.end).toISOString()
          }))
        
        console.log('[CreateEventWizard] Inserting new polls:', pollData)
        
        if (pollData.length > 0) {
          const { data: insertedPolls, error } = await supabase
            .from('event_time_polls')
            .insert(pollData)
            .select()
          
          if (error) {
            console.error('[CreateEventWizard] Error inserting polls:', error)
            throw new Error(`无法保存时间选项: ${error.message}`)
          }
          
          console.log('[CreateEventWizard] Successfully inserted polls:', insertedPolls)
        }
      } else {
        console.log('[CreateEventWizard] Not in polling mode, skipping poll insertion')
      }
    } else {
      // --- Create Logic ---
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

      const { data: event, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (error) throw error
      savedEventId = event.id

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
    }

    // Use replace instead of push to avoid adding to history
    // This prevents "back" button from going back to edit mode
    router.replace(`/events/${savedEventId}`)
  } catch (err: any) {
    console.error('Error saving event:', err)
    alert(err.message || '操作失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen transition-colors duration-300" :class="isDark ? 'bg-black text-white' : 'bg-surface-light text-black'">
    <!-- 背景网格装饰 -->
    <div class="absolute inset-0 pointer-events-none" 
         :style="{ 
           backgroundImage: isDark 
             ? `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)` 
             : `linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
           backgroundSize: '40px 40px' 
         }">
    </div>
    
    <!-- 顶部技术参数装饰 -->
    <div class="absolute top-0 left-0 w-full h-8 border-b flex items-center justify-between px-4 text-[10px] font-mono opacity-50 uppercase"
         :class="isDark ? 'border-white/20' : 'border-black/10'">
      <span>SYS.TACIT.V1</span>
      <span>COORDINATES: {{ currentStep }}/{{ totalSteps }}</span>
      <span>MODE: {{ isEditMode ? 'EDITOR' : 'WIZARD' }}</span>
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
                class="flex-1 h-1 bg-current opacity-10 transition-all duration-300"
                :class="{ '!opacity-100 !bg-coral-pink shadow-[0_0_10px_rgba(255,138,149,0.5)]': step <= currentStep }"
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

                <!-- 两个入口选择 -->
                <div v-if="timeMode === null" class="space-y-4">
                  <label class="block text-xs font-bold text-coral-pink uppercase tracking-wider mb-4">Time Selection Mode</label>
                  <div class="grid grid-cols-2 gap-4">
                    <button
                      @click="timeMode = 'fixed'; isDecideLater = false"
                      type="button"
                      class="p-6 border-4 border-white/30 bg-white/5 hover:border-coral-pink hover:bg-coral-pink/10 transition-all duration-300 text-left group"
                    >
                      <div class="flex items-center gap-3 mb-2">
                        <iconify-icon icon="material-symbols:calendar-today" class="text-2xl group-hover:scale-110 transition-transform" />
                        <span class="font-black text-lg uppercase tracking-wider">Fixed Time</span>
                      </div>
                      <p class="text-xs opacity-70 font-mono">Set specific date & time directly</p>
                    </button>
                    <button
                      @click="timeMode = 'polling'; isDecideLater = true"
                      type="button"
                      class="p-6 border-4 border-white/30 bg-white/5 hover:border-coral-pink hover:bg-coral-pink/10 transition-all duration-300 text-left group"
                    >
                      <div class="flex items-center gap-3 mb-2">
                        <iconify-icon icon="material-symbols:poll" class="text-2xl group-hover:scale-110 transition-transform" />
                        <span class="font-black text-lg uppercase tracking-wider">Find Time</span>
                      </div>
                      <p class="text-xs opacity-70 font-mono">Let participants vote for best time</p>
                    </button>
                  </div>
                </div>

                <!-- 显示当前选择的模式 -->
                <div v-else class="p-4 border-2 border-coral-pink/50 bg-coral-pink/10">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <iconify-icon 
                        :icon="timeMode === 'fixed' ? 'material-symbols:calendar-today' : 'material-symbols:poll'" 
                        class="text-xl" 
                      />
                      <span class="font-bold uppercase tracking-wider">
                        {{ timeMode === 'fixed' ? 'Fixed Time Mode' : 'Find Time (Polling) Mode' }}
                      </span>
                    </div>
                    <button
                      @click="timeMode = null"
                      type="button"
                      class="text-xs font-mono uppercase hover:text-coral-pink transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div v-if="timeMode === 'fixed' && !isDecideLater" class="relative">
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
              
              <!-- 固定时间模式 -->
              <div v-if="timeMode === 'fixed' && !isDecideLater" class="space-y-6">
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

              <!-- 投票模式：调研截止时间 -->
              <div v-if="timeMode === 'polling' && isDecideLater" class="space-y-6 mb-6">
                <div class="p-4 border-2 border-coral-pink/50 bg-coral-pink/10">
                  <div class="flex items-center gap-3 mb-4">
                    <iconify-icon icon="material-symbols:poll" class="text-2xl text-coral-pink" />
                    <span class="font-black text-lg uppercase tracking-wider">Poll Deadline</span>
                  </div>
                  <p class="text-xs opacity-70 mb-4 font-mono">
                    Set a deadline for participants to submit their availability. After the deadline, invite cards will be automatically generated.
                  </p>
                  <div>
                    <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Deadline Date & Time</label>
                    <input
                      v-model="pollDeadline"
                      type="datetime-local"
                      required
                      class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                      :min="new Date().toISOString().slice(0, 16)"
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
                <h2 class="text-3xl font-black mb-6 uppercase tracking-wider">TIME OPTIONS</h2>
                <p class="text-sm opacity-70 mb-6 font-mono">
                  Add time slots for participants to vote on. They can choose which times work best for them.
                </p>
                
                <div class="space-y-4">
                  <div
                    v-for="(slot, index) in timeSlots"
                    :key="index"
                    class="p-4 border-2 border-white/30 bg-black/50 space-y-3"
                  >
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block font-bold mb-2 uppercase text-xs tracking-wider text-coral-pink">START</label>
                        <input
                          v-model="slot.start"
                          type="datetime-local"
                          class="w-full px-4 py-3 border-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-coral-pink font-mono text-sm"
                          placeholder="YYYY-MM-DDTHH:mm"
                        />
                      </div>
                      <div>
                        <label class="block font-bold mb-2 uppercase text-xs tracking-wider text-coral-pink">END</label>
                        <input
                          v-model="slot.end"
                          type="datetime-local"
                          class="w-full px-4 py-3 border-2 border-white/30 bg-transparent text-white focus:outline-none focus:border-coral-pink font-mono text-sm"
                          placeholder="YYYY-MM-DDTHH:mm"
                        />
                      </div>
                    </div>
                    <button
                      @click="removeTimeSlot(index)"
                      type="button"
                      class="w-full px-4 py-2 bg-red-600 text-white font-bold border-2 border-white/30 hover:bg-red-700 transition-colors uppercase text-sm"
                    >
                      REMOVE
                    </button>
                  </div>

                  <button
                    @click="addTimeSlot"
                    type="button"
                    class="w-full px-6 py-4 bg-coral-pink text-black font-black border-2 border-white/30 hover:bg-coral-pink/90 transition-colors uppercase flex items-center justify-center gap-2"
                  >
                    <iconify-icon icon="material-symbols:add" class="text-xl" />
                    ADD TIME SLOT
                  </button>

                  <div v-if="timeSlots.length === 0" class="text-center py-8 opacity-50">
                    <p class="text-sm font-mono">No time slots added yet. Click "ADD TIME SLOT" to add options for participants to vote on.</p>
                  </div>
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
                    <span class="font-bold uppercase text-sm tracking-wider">Spotify Playlist (Sonic Landscape)</span>
                  </label>
                  <div v-if="modules.spotify.enabled" class="space-y-2">
                    <input
                      v-model="modules.spotify.url"
                      type="url"
                      class="w-full px-4 py-3 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
                      placeholder="https://open.spotify.com/playlist/..."
                    />
                    <div class="text-xs text-white/60 leading-relaxed">
                      <div class="font-bold mb-1">如何获取 Spotify 链接：</div>
                      <ol class="list-decimal list-inside space-y-1">
                        <li>打开 Spotify 应用或网页版</li>
                        <li>找到你的播放列表、专辑或歌曲</li>
                        <li>点击右上角的 <span class="font-bold">"分享"</span> 或 <span class="font-bold">"..."</span> 按钮</li>
                        <li>选择 <span class="font-bold">"复制链接到播放列表"</span> 或 <span class="font-bold">"复制链接"</span></li>
                        <li>将复制的链接粘贴到上方输入框</li>
                      </ol>
                      <div class="mt-2 text-[10px] opacity-50">支持：播放列表 / 专辑 / 单曲 / 艺术家</div>
                    </div>
                  </div>
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
                        placeholder="https://www.amazon.com/hz/wishlist/..."
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
                    
                    <!-- 使用说明 -->
                    <div class="text-xs text-white/60 leading-relaxed mt-4 pt-4 border-t border-white/10">
                      <div class="font-bold mb-2">如何获取礼品链接：</div>
                      
                      <div class="mb-3">
                        <div class="font-semibold mb-1">📦 Amazon 心愿单：</div>
                        <ol class="list-decimal list-inside space-y-1 ml-2">
                          <li>访问 <span class="font-bold">amazon.com</span> 并登录账户</li>
                          <li>点击右上角"账户与列表" → "创建心愿单"</li>
                          <li>添加想要的礼品到心愿单</li>
                          <li>进入心愿单页面，点击右上角"..." → "管理心愿单"</li>
                          <li>找到"通过链接分享"，复制链接地址</li>
                          <li>将链接粘贴到上方输入框</li>
                        </ol>
                      </div>
                      
                      <div class="mb-3">
                        <div class="font-semibold mb-1">🎁 其他 Wishlist 平台：</div>
                        <ul class="list-disc list-inside space-y-1 ml-2">
                          <li><span class="font-bold">淘宝心愿单：</span> 打开商品页面，点击"加入心愿单"，复制分享链接</li>
                          <li><span class="font-bold">京东心愿单：</span> 在商品页面点击"加入心愿单"，复制链接</li>
                          <li><span class="font-bold">其他平台：</span> 复制任意商品的直接链接（单个礼品链接）</li>
                        </ul>
                      </div>
                      
                      <div class="text-[10px] opacity-50 italic mt-2">
                        提示：可以添加多个链接，支持单个商品链接或整个心愿单链接
                      </div>
                    </div>
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
                  <div v-if="modules.dressCode.enabled" class="space-y-3">
                    <textarea
                      v-model="modules.dressCode.text"
                      rows="4"
                      class="w-full px-4 py-3 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold resize-none"
                      placeholder="例如：Smart Casual / 商务休闲 / 白色主题 / 复古风格..."
                    ></textarea>
                    
                    <!-- 使用说明和示例 -->
                    <div class="text-xs text-white/60 leading-relaxed">
                      <div class="font-bold mb-2">填写说明：</div>
                      
                      <div class="mb-3">
                        <div class="font-semibold mb-1">💡 基本格式示例：</div>
                        <ul class="list-disc list-inside space-y-1 ml-2">
                          <li><span class="font-bold">正式/商务：</span> "Formal / 正装 / Black Tie"</li>
                          <li><span class="font-bold">休闲：</span> "Casual / 休闲 / 舒适随意"</li>
                          <li><span class="font-bold">主题色：</span> "白色主题 / 红色元素 / All Black"</li>
                          <li><span class="font-bold">风格：</span> "复古 / 波西米亚 / 运动风"</li>
                        </ul>
                      </div>
                      
                      <div class="mb-3">
                        <div class="font-semibold mb-1">✨ 详细描述示例：</div>
                        <div class="bg-black/30 p-2 rounded border border-white/10 text-[11px] font-mono italic">
                          "Smart Casual - 商务休闲风格，避免过于正式或过于随意。建议：衬衫/针织衫 + 休闲裤/牛仔裤。"
                        </div>
                      </div>
                      
                      <div class="text-[10px] opacity-50 italic mt-2">
                        提示：简洁明了地描述着装要求，帮助参与者准备合适的服装
                      </div>
                    </div>
                  </div>
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

                <!-- Font Selection -->
                <div>
                  <label class="block font-bold mb-3 uppercase text-sm tracking-wider">Font Family</label>
                  <select
                    v-model="theme.font"
                    class="w-full px-4 py-4 border-4 border-white bg-black text-white focus:outline-none focus:border-coral-pink font-bold"
                    :style="{ fontFamily: theme.font }"
                  >
                    <optgroup 
                      v-for="category in ['sans-serif', 'display', 'serif', 'monospace']" 
                      :key="category"
                      :label="category.charAt(0).toUpperCase() + category.slice(1)"
                    >
                      <option
                        v-for="font in availableFonts.filter(f => f.category === category)"
                        :key="font.name"
                        :value="font.name"
                      >
                        {{ font.name }} - {{ font.description }}
                      </option>
                    </optgroup>
                  </select>
                  <p class="text-xs opacity-60 mt-2 italic">Preview: <span :style="{ fontFamily: theme.font }">The quick brown fox jumps over the lazy dog</span></p>
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
              @click="handleSave"
              :disabled="loading"
              type="button"
              class="flex-1 px-6 py-4 bg-coral-pink text-black font-black border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Event') }}
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

    <!-- Luma-style Bottom Configuration Bar -->
    <div v-if="currentStep === 5" class="fixed bottom-0 left-0 w-full z-50 flex justify-center pb-6 px-4 pointer-events-none">
      <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2 pointer-events-auto max-w-3xl w-full flex flex-col gap-4 animate-slide-up">
        
        <!-- Config Panels -->
        <div v-if="showConfigPanel" class="px-4 pt-2 pb-4 border-b border-white/10 min-h-[160px]">
          
          <!-- Color Panel -->
          <div v-if="activeConfigTab === 'color'" class="space-y-4">
            <div class="text-xs font-bold uppercase tracking-widest opacity-50">Primary Color</div>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="color in presetColors"
                :key="color"
                @click="theme.primaryColor = color"
                class="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 relative group"
                :class="theme.primaryColor === color ? 'border-white ring-2 ring-white/50' : 'border-transparent hover:border-white/50'"
                :style="{ backgroundColor: color }"
              >
                <span v-if="theme.primaryColor === color" class="absolute inset-0 flex items-center justify-center">
                  <span class="iconify text-black/50 text-xl" data-icon="material-symbols:check"></span>
                </span>
              </button>
              <!-- Custom Color Picker -->
              <label class="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors relative overflow-hidden">
                <input type="color" v-model="theme.primaryColor" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <span class="iconify text-xl" data-icon="material-symbols:add"></span>
              </label>
            </div>
          </div>

          <!-- Theme Panel -->
          <div v-if="activeConfigTab === 'theme'" class="space-y-4">
            <div class="text-xs font-bold uppercase tracking-widest opacity-50">Theme Preset</div>
            <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <button
                v-for="(preset, key) in themePresets"
                :key="key"
                @click="theme.preset = key"
                class="flex-shrink-0 w-32 p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group hover:bg-white/5"
                :class="theme.preset === key ? 'border-coral-pink bg-white/10' : 'border-white/10'"
              >
                <div class="w-full aspect-video rounded bg-black/50 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-colors">
                  <span 
                    class="iconify text-2xl transition-transform group-hover:scale-110"
                    :data-icon="preset.icon"
                    :style="{ color: theme.preset === key ? preset.primaryColor : 'white' }"
                  ></span>
                </div>
                <span class="text-xs font-bold uppercase">{{ preset.name }}</span>
              </button>
            </div>
          </div>

          <!-- Font Panel -->
          <div v-if="activeConfigTab === 'font'" class="space-y-4">
            <div class="text-xs font-bold uppercase tracking-widest opacity-50">Typography</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              <button
                v-for="font in availableFonts"
                :key="font.name"
                @click="theme.font = font.name"
                class="p-3 rounded-lg border text-left transition-all hover:bg-white/5 flex flex-col justify-center"
                :class="theme.font === font.name ? 'border-coral-pink bg-white/5' : 'border-white/10'"
              >
                <span class="text-xl leading-none mb-1" :style="{ fontFamily: font.name }">Ag</span>
                <span class="text-[10px] opacity-60 uppercase tracking-wider truncate w-full">{{ font.name }}</span>
              </button>
            </div>
          </div>

          <!-- Appearance Panel -->
          <div v-if="activeConfigTab === 'appearance'" class="space-y-4">
            <div class="text-xs font-bold uppercase tracking-widest opacity-50">Appearance Mode</div>
            <div class="flex gap-4">
              <button
                @click="isDark = false"
                class="flex-1 p-4 rounded-xl border-2 flex items-center gap-3 transition-all"
                :class="!isDark ? 'border-coral-pink bg-white/10' : 'border-white/10 hover:bg-white/5'"
              >
                <div class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-black">
                  <span class="iconify" data-icon="material-symbols:light-mode"></span>
                </div>
                <span class="font-bold">Light</span>
              </button>
              <button
                @click="isDark = true"
                class="flex-1 p-4 rounded-xl border-2 flex items-center gap-3 transition-all"
                :class="isDark ? 'border-coral-pink bg-white/10' : 'border-white/10 hover:bg-white/5'"
              >
                <div class="w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-white">
                  <span class="iconify" data-icon="material-symbols:dark-mode"></span>
                </div>
                <span class="font-bold">Dark</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Menu Bar -->
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-1">
            <button
              @click="openConfig('color')"
              class="px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider"
              :class="{ 'text-coral-pink bg-white/5': activeConfigTab === 'color' }"
            >
              <div class="w-3 h-3 rounded-full border border-white/50" :style="{ backgroundColor: theme.primaryColor }"></div>
              Color
            </button>
            <button
              @click="openConfig('theme')"
              class="px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider"
              :class="{ 'text-coral-pink bg-white/5': activeConfigTab === 'theme' }"
            >
              <span class="iconify" data-icon="material-symbols:palette-outline"></span>
              Theme
            </button>
            <button
              @click="openConfig('font')"
              class="px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider"
              :class="{ 'text-coral-pink bg-white/5': activeConfigTab === 'font' }"
            >
              <span class="iconify" data-icon="material-symbols:text-fields"></span>
              Font
            </button>
            <button
              @click="openConfig('appearance')"
              class="px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-wider"
              :class="{ 'text-coral-pink bg-white/5': activeConfigTab === 'appearance' }"
            >
              <span class="iconify" :data-icon="isDark ? 'material-symbols:dark-mode-outline' : 'material-symbols:light-mode-outline'"></span>
              Mode
            </button>
          </div>
          
          <button
            v-if="showConfigPanel"
            @click="showConfigPanel = false; activeConfigTab = null"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span class="iconify text-lg" data-icon="material-symbols:close"></span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

