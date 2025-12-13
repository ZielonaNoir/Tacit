<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  eventId: string
  eventTitle: string
  primaryColor?: string
}>()

const showShareModal = ref(false)
const inviteLink = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/events/${props.eventId}`
})

const copyButtonText = ref('Copy')

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

const downloadICS = () => {
  // TODO: Generate ICS file for calendar
  alert('日历邀请功能即将推出')
}

const shareOptions = [
  { name: 'Copy Link', icon: 'material-symbols:content-copy', action: copyToClipboard },
  { name: 'Share', icon: 'material-symbols:share', action: shareViaWebShare },
  { name: 'Calendar', icon: 'material-symbols:calendar-add-on', action: downloadICS }
]
</script>

<template>
  <div class="relative">
    <!-- Invite Button -->
    <button
      @click="showShareModal = !showShareModal"
      class="px-4 py-2 rounded-lg border-2 flex items-center gap-2 hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-wider"
      :style="{ borderColor: primaryColor || '#FF8A95', color: primaryColor || '#FF8A95' }"
    >
      <span class="iconify" data-icon="material-symbols:link"></span>
      Invite
    </button>

    <!-- Share Modal -->
    <div
      v-if="showShareModal"
      class="absolute top-full mt-2 right-0 bg-black border-2 p-6 z-50 min-w-[320px]"
      :style="{ borderColor: primaryColor || '#FF8A95' }"
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

    <!-- Overlay to close modal -->
    <div
      v-if="showShareModal"
      class="fixed inset-0 z-40"
      @click="showShareModal = false"
    ></div>
  </div>
</template>

