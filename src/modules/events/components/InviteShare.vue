<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { generateInviteCard, fetchEventInviteCards } from '@/modules/polling/services'
import type { TacitEvent, InviteCard } from '@/types/database'

const props = defineProps<{
  eventId: string
  eventTitle: string
  event?: TacitEvent | null
  primaryColor?: string
}>()

const { user } = useAuth()

const isHost = computed(() => {
  return props.event && user.value && props.event.creator_id === user.value.id
})

const showShareModal = ref(false)
const inviteLink = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/events/${props.eventId}`
})

const copyButtonText = ref('Copy')

// Invite Cards
const inviteCards = ref<InviteCard[]>([])
const loadingInviteCards = ref(false)
const generatingInviteCard = ref(false)
const copiedCardIndex = ref<number | null>(null)

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    // Show feedback
    const originalText = copyButtonText.value
    copyButtonText.value = '✓ Copied'
    setTimeout(() => {
      copyButtonText.value = originalText
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    // Fallback: select text
    const textArea = document.createElement('textarea')
    textArea.value = inviteLink.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copyButtonText.value = '✓ Copied'
    setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
  }
}

const shareViaWebShare = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Join ${props.eventTitle} on Tacit`,
        text: `You're invited to ${props.eventTitle}!`,
        url: inviteLink.value
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err)
      }
    }
  } else {
    // Fallback to copy
    copyToClipboard()
  }
}

const generateICS = (): string => {
  if (!props.event) {
    alert('事件信息不完整，无法生成日历文件')
    return ''
  }

  const event = props.event
  const baseUrl = window.location.origin
  
  // ICS 文件需要的时间格式：YYYYMMDDTHHmmssZ (UTC)
  const formatICSDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  // 生成唯一 ID
  const uid = `${props.eventId}@${baseUrl.replace(/https?:\/\//, '')}`
  
  // 当前时间（用于 DTSTAMP）
  const now = new Date()
  const dtstamp = formatICSDate(now.toISOString())
  
  // 开始和结束时间
  const dtstart = formatICSDate(event.start_time)
  const dtend = formatICSDate(event.end_time)
  
  // 如果没有时间，无法生成有效的 ICS 文件
  if (!dtstart || !dtend) {
    alert('活动时间未设置，无法生成日历文件')
    return ''
  }

  // 转义 ICS 文本字段（换行、逗号、分号等需要转义）
  const escapeICS = (text: string | null): string => {
    if (!text) return ''
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  // 构建 ICS 内容
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tacit//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
    event.location_name || event.location_address 
      ? `LOCATION:${escapeICS(event.location_name || event.location_address || '')}`
      : '',
    `URL:${inviteLink.value}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '') // 移除空行

  return lines.join('\r\n')
}

const downloadICS = () => {
  const icsContent = generateICS()
  if (!icsContent) return

  // 创建 Blob 并下载
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.eventTitle.replace(/[^a-z0-9]/gi, '_')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const shareOptions = [
  { name: 'Copy Link', icon: 'material-symbols:content-copy', action: copyToClipboard },
  { name: 'Share', icon: 'material-symbols:share', action: shareViaWebShare },
  { name: 'Calendar', icon: 'material-symbols:calendar-add-on', action: downloadICS }
]

// Position for modal (to avoid mix-blend-difference from parent)
const modalPosition = ref({ top: 0, right: 0 })
const buttonRef = ref<HTMLElement | null>(null)

const updateModalPosition = () => {
  if (buttonRef.value && showShareModal.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    modalPosition.value = {
      top: rect.bottom + 8, // mt-2 = 8px
      right: window.innerWidth - rect.right
    }
  }
}

onMounted(() => {
  window.addEventListener('resize', updateModalPosition)
  window.addEventListener('scroll', updateModalPosition, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateModalPosition)
  window.removeEventListener('scroll', updateModalPosition, true)
})

// Watch for modal visibility changes to update position
watch(showShareModal, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    updateModalPosition()
    // Load invite cards when modal opens
    if (isHost.value) {
      await loadInviteCards()
    }
  }
})

// Load invite cards
const loadInviteCards = async () => {
  if (!isHost.value) return
  
  loadingInviteCards.value = true
  try {
    inviteCards.value = await fetchEventInviteCards(props.eventId)
  } catch (err) {
    console.error('Failed to load invite cards:', err)
    alert('无法加载邀请卡')
  } finally {
    loadingInviteCards.value = false
  }
}

// Generate new invite card
const handleGenerateInviteCard = async () => {
  if (!isHost.value) return
  
  generatingInviteCard.value = true
  try {
    const newCard = await generateInviteCard(props.eventId)
    inviteCards.value.unshift(newCard) // Add to beginning of list
    alert('邀请卡生成成功！')
  } catch (err: any) {
    console.error('Failed to generate invite card:', err)
    alert(err.message || '无法生成邀请卡')
  } finally {
    generatingInviteCard.value = false
  }
}

// Copy invite card link
const copyInviteCardLink = async (card: InviteCard, index: number) => {
  try {
    await navigator.clipboard.writeText(card.invite_link)
    copiedCardIndex.value = index
    setTimeout(() => {
      copiedCardIndex.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    // Fallback
    const textArea = document.createElement('textarea')
    textArea.value = card.invite_link
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    copiedCardIndex.value = index
    setTimeout(() => {
      copiedCardIndex.value = null
    }, 2000)
  }
}

// Format date for display
const formatDate = (dateString: string | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status badge text
const getStatusText = (status: InviteCard['status']) => {
  const statusMap = {
    pending: '待发送',
    sent: '已发送',
    opened: '已打开',
    responded: '已回复'
  }
  return statusMap[status] || status
}
</script>

<template>
  <div class="relative">
    <!-- Invite Button -->
    <button
      ref="buttonRef"
      @click="showShareModal = !showShareModal"
      class="px-4 py-2 rounded-lg border-2 flex flex-wrap items-center gap-2 hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-wider"
      :style="{ borderColor: 'rgba(0, 0, 0, 1)', backgroundColor: 'rgba(255, 255, 255, 1)', color: 'rgba(0, 0, 0, 1)' }"
    >
      <span class="iconify" data-icon="material-symbols:link"></span>
      Invite
    </button>

    <!-- Share Modal (Teleported to body to avoid mix-blend-difference) -->
    <Teleport to="body">
      <div
        v-if="showShareModal"
        class="fixed border-2 p-6 z-[9999] min-w-[320px] max-w-[420px] max-h-[90vh] overflow-y-auto text-white shadow-2xl"
        :style="{ 
          top: `${modalPosition.top}px`,
          right: `${modalPosition.right}px`,
          backgroundColor: '#000000',
          borderColor: primaryColor || '#FF8A95'
        }"
        @click.stop
      >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-black uppercase tracking-wider">Share Event</h3>
        <button
          @click="showShareModal = false"
          class="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
        >
          <span class="iconify text-lg" data-icon="material-symbols:close"></span>
        </button>
      </div>

      <!-- Invite Link Display -->
      <div class="mb-6">
        <label class="block text-xs font-bold uppercase tracking-wider mb-2 opacity-60">Invite Link</label>
        <div class="flex gap-2">
          <input
            :value="inviteLink"
            readonly
            class="flex-1 px-4 py-2 bg-white/5 border border-white/20 text-white text-sm font-mono focus:outline-none"
          />
          <button
            @click="copyToClipboard"
            class="px-4 py-2 bg-coral-pink text-black font-bold uppercase text-xs border-2 border-black hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            {{ copyButtonText }}
          </button>
        </div>
      </div>

      <!-- Share Options -->
      <div class="space-y-2">
        <div class="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Quick Share</div>
        <button
          v-for="option in shareOptions"
          :key="option.name"
          @click="option.action(); showShareModal = false"
          class="w-full p-3 border-2 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
          :style="{ borderColor: primaryColor || '#FF8A95' }"
        >
          <span class="iconify text-xl" :data-icon="option.icon"></span>
          <span class="font-bold uppercase text-sm">{{ option.name }}</span>
        </button>
      </div>

      <!-- Invite Cards Section (Host Only) -->
      <div v-if="isHost" class="mt-6 pt-6 border-t border-white/10">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs font-bold uppercase tracking-wider opacity-60">Invite Cards</div>
          <button
            @click="handleGenerateInviteCard"
            :disabled="generatingInviteCard"
            class="px-3 py-1.5 text-xs font-bold uppercase border-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ borderColor: primaryColor || '#FF8A95' }"
          >
            <span v-if="generatingInviteCard" class="flex items-center gap-2">
              <span class="iconify animate-spin" data-icon="material-symbols:refresh"></span>
              Generating...
            </span>
            <span v-else class="flex items-center gap-2">
              <span class="iconify" data-icon="material-symbols:add"></span>
              Generate
            </span>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loadingInviteCards" class="text-center py-4">
          <div class="text-xs opacity-50">Loading invite cards...</div>
        </div>

        <!-- Invite Cards List -->
        <div v-else-if="inviteCards.length > 0" class="space-y-3 max-h-[300px] overflow-y-auto">
          <div
            v-for="(card, index) in inviteCards"
            :key="card.id"
            class="p-3 border-2 bg-white/5 rounded"
            :style="{ borderColor: primaryColor || '#FF8A95' }"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1 min-w-0">
                <div class="text-xs font-mono font-bold mb-1 truncate">{{ card.invite_code }}</div>
                <div class="text-[10px] opacity-50 mb-1">
                  {{ getStatusText(card.status) }}
                </div>
                <div class="text-[10px] opacity-40">
                  {{ formatDate(card.created_at) }}
                </div>
              </div>
              <button
                @click="copyInviteCardLink(card, index)"
                class="px-2 py-1 text-[10px] font-bold uppercase border-2 hover:bg-white/10 transition-colors flex-shrink-0"
                :style="{ borderColor: primaryColor || '#FF8A95' }"
              >
                <span v-if="copiedCardIndex === index" class="flex items-center gap-1">
                  <span class="iconify text-xs" data-icon="material-symbols:check"></span>
                  Copied
                </span>
                <span v-else class="flex items-center gap-1">
                  <span class="iconify text-xs" data-icon="material-symbols:content-copy"></span>
                  Copy
                </span>
              </button>
            </div>
            <div class="text-[10px] font-mono opacity-60 truncate mt-2">
              {{ card.invite_link }}
            </div>
            <div v-if="card.opened_at" class="text-[10px] opacity-40 mt-1">
              Opened: {{ formatDate(card.opened_at) }}
            </div>
            <div v-if="card.responded_at" class="text-[10px] opacity-40 mt-1">
              Responded: {{ formatDate(card.responded_at) }}
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-4">
          <div class="text-xs opacity-50 mb-2">No invite cards yet</div>
          <div class="text-[10px] opacity-40">Generate one to create a personalized invite link</div>
        </div>
      </div>

      <!-- QR Code Placeholder (Future Enhancement) -->
      <div class="mt-6 pt-6 border-t border-white/10 text-center">
        <div class="text-xs opacity-50 uppercase tracking-wider mb-2">QR Code</div>
        <div class="w-32 h-32 mx-auto bg-white/5 border-2 border-dashed flex items-center justify-center"
             :style="{ borderColor: primaryColor || '#FF8A95' }">
          <span class="iconify text-4xl opacity-30" data-icon="material-symbols:qr-code-2"></span>
        </div>
        <p class="text-xs opacity-50 mt-2">Scan to join</p>
      </div>
      </div>
    </Teleport>

    <!-- Overlay to close modal -->
    <Teleport to="body">
      <div
        v-if="showShareModal"
        class="fixed inset-0 z-[9998]"
        @click="showShareModal = false"
      ></div>
    </Teleport>
  </div>
</template>

