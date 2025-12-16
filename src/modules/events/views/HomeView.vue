<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteUpdate } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import { useGuestIdentity } from '@/composables/useGuestIdentity'
import type { TacitEvent } from '@/types/database'

const router = useRouter()
const route = useRoute()
const { user, isAuthenticated, signOut, loading: authLoading } = useAuth()
const { guestId } = useGuestIdentity()
const events = ref<TacitEvent[]>([])
const loading = ref(true)

// 提取数据加载逻辑为独立函数
const loadEvents = async () => {
  loading.value = true
  try {
    if (isAuthenticated.value && user.value) {
      // Logged in user: show events they created AND events they've been invited to
      const eventIds = new Set<string>()
      console.log('[HomeView] Logged in user:', user.value.id)

      // 1. Events they created
      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', user.value.id)

      if (createdError) {
        console.error('[HomeView] Error fetching created events:', createdError)
        throw createdError
      }

      console.log('[HomeView] Created events:', createdEvents?.length || 0, createdEvents)
      if (createdEvents) {
        createdEvents.forEach(event => eventIds.add(event.id))
      }

      // 2. Events through invite cards (check all statuses, not just opened/responded)
      console.log('[HomeView] Querying invite cards for user_id:', user.value.id)
      const { data: inviteCards, error: inviteError } = await supabase
        .from('invite_cards')
        .select('event_id, status, user_id')
        .eq('user_id', user.value.id)

      if (inviteError) {
        console.error('[HomeView] Error fetching invite cards:', inviteError)
        // Don't throw, just log
      } else {
        console.log('[HomeView] Invite cards found:', inviteCards?.length || 0, inviteCards)
        if (inviteCards) {
          inviteCards.forEach(card => {
            console.log('[HomeView] Adding event from invite card:', card.event_id, 'status:', card.status)
            eventIds.add(card.event_id)
          })
        }
      }

      // 3. Events through RSVPs (in case invite card user_id wasn't set)
      const { data: rsvps, error: rsvpError } = await supabase
        .from('rsvps')
        .select('event_id')
        .eq('user_id', user.value.id)

      if (rsvpError) {
        console.error('[HomeView] Error fetching RSVPs:', rsvpError)
        // Don't throw, just log
      } else {
        console.log('[HomeView] RSVPs found:', rsvps?.length || 0, rsvps)
        if (rsvps) {
          rsvps.forEach(rsvp => {
            console.log('[HomeView] Adding event from RSVP:', rsvp.event_id)
            eventIds.add(rsvp.event_id)
          })
        }
      }

      console.log('[HomeView] Total unique event IDs:', eventIds.size, Array.from(eventIds))

      if (eventIds.size === 0) {
        events.value = []
        console.log('[HomeView] No events found for logged-in user')
      } else {
        // Fetch all events
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('id', Array.from(eventIds))
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('[HomeView] Supabase error fetching events:', error)
          throw error
        }

        console.log('[HomeView] Fetched events:', data?.length || 0, data)
        events.value = data || []
        console.log(`[HomeView] Loaded ${events.value.length} events for logged-in user`)
      }
    } else {
      // Guest user: only show events where they have accepted invite cards
      // Find events through:
      // 1. Invite cards with this guest_id (check all statuses)
      // 2. RSVPs with this guest_id (indicates they've interacted with the event)
      const eventIds = new Set<string>()
      console.log('[HomeView] Guest user ID:', guestId.value)

      // First, find all invite cards for this guest (check all statuses)
      const { data: inviteCards, error: inviteError } = await supabase
        .from('invite_cards')
        .select('event_id, status, guest_id')
        .eq('guest_id', guestId.value)

      if (inviteError) {
        console.error('[HomeView] Error fetching invite cards:', inviteError)
        throw inviteError
      }

      console.log('[HomeView] Invite cards found for guest:', inviteCards?.length || 0, inviteCards)
      if (inviteCards) {
        inviteCards.forEach(card => {
          console.log('[HomeView] Adding event from invite card:', card.event_id, 'status:', card.status)
          eventIds.add(card.event_id)
        })
      }

      // Also find events through RSVPs (guest may have RSVP'd even if invite card status isn't updated)
      const { data: rsvps, error: rsvpError } = await supabase
        .from('rsvps')
        .select('event_id')
        .eq('guest_id', guestId.value)

      if (rsvpError) {
        console.error('[HomeView] Error fetching RSVPs:', rsvpError)
        // Don't throw, just log - RSVPs are optional
      } else {
        console.log('[HomeView] RSVPs found for guest:', rsvps?.length || 0, rsvps)
        if (rsvps) {
          rsvps.forEach(rsvp => {
            console.log('[HomeView] Adding event from RSVP:', rsvp.event_id)
            eventIds.add(rsvp.event_id)
          })
        }
      }

      console.log('[HomeView] Total unique event IDs for guest:', eventIds.size, Array.from(eventIds))

      if (eventIds.size === 0) {
        events.value = []
        console.log('[HomeView] No invite cards or RSVPs found for guest')
      } else {
        // Fetch events for these IDs
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('id', Array.from(eventIds))
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('[HomeView] Supabase error fetching events:', error)
          throw error
        }

        console.log('[HomeView] Fetched events for guest:', data?.length || 0, data)
        events.value = data || []
        console.log(`[HomeView] Loaded ${events.value.length} events for guest`)
      }
    }
  } catch (err) {
    console.error('Error fetching events:', err)
    // Show error to user
    const errorMessage = err instanceof Error ? err.message : '未知错误'
    console.error('Full error details:', err)
    alert(`加载活动列表失败: ${errorMessage}`)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 等待认证状态加载完成后再加载数据
  if (authLoading.value) {
    // 如果认证还在加载中，等待一下
    const unwatch = watch(authLoading, async (isLoading) => {
      if (!isLoading) {
        await loadEvents()
        unwatch()
      }
    })
  } else {
    await loadEvents()
  }
})

// 监听路由变化，当导航到 home 时重新加载数据
watch(() => route.name, async (newName, oldName) => {
  // 当从其他路由返回到 home 时，重新加载数据
  if (newName === 'home' && oldName !== 'home') {
    console.log('[HomeView] Route changed to home, reloading events')
    await loadEvents()
  }
})

// 监听路由更新（当在同一路由内导航时）
onBeforeRouteUpdate(async (to, from) => {
  if (to.name === 'home' && from.name !== 'home') {
    console.log('[HomeView] Route updated to home, reloading events')
    await loadEvents()
  }
})

// 监听认证状态变化，确保在认证状态确定后重新加载
watch([isAuthenticated, () => user.value?.id, guestId], async () => {
  // 如果当前在 home 路由，重新加载数据
  if (route.name === 'home') {
    console.log('[HomeView] Auth or identity changed, reloading events')
    await loadEvents()
  }
}, { immediate: false })

const handleCreateEvent = () => {
  if (isAuthenticated.value) {
    router.push('/events/create')
  } else {
    router.push({ name: 'login', query: { redirect: '/events/create' } })
  }
}

const handleLogout = async () => {
  try {
    await signOut()
    router.push('/')
  } catch (err) {
    console.error('Logout error:', err)
  }
}
</script>

<template>
  <div class="min-h-screen bg-black text-white relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 pointer-events-none opacity-20"
      style="background-image: radial-gradient(circle, #333 1px, transparent 1px); background-size: 30px 30px;">
    </div>

    <!-- 顶部导航 -->
    <nav class="border-b border-white/20 relative z-10 bg-black/80 backdrop-blur-md">
      <div class="container mx-auto px-4 h-20 flex justify-between items-center">
        <h1 class="text-3xl font-black tracking-tighter uppercase font-heading flex items-center gap-2">
          <span class="w-4 h-4 bg-coral-pink"></span>
          Tacit
        </h1>

        <div class="flex gap-6 items-center">
          <div v-if="isAuthenticated && user" class="flex items-center gap-6">
            <span class="font-mono text-xs opacity-60 hidden md:block">{{ user.email }}</span>
            <button @click="handleLogout"
              class="text-xs font-bold uppercase tracking-widest hover:text-coral-pink transition-colors">
              [ Log Out ]
            </button>
          </div>
          <div v-else class="flex gap-4">
            <router-link to="/login"
              class="text-sm font-bold uppercase tracking-wider hover:text-coral-pink transition-colors">
              Log In
            </router-link>
            <router-link to="/register"
              class="text-sm font-bold uppercase tracking-wider hover:text-coral-pink transition-colors">
              Register
            </router-link>
          </div>
          <button @click="handleCreateEvent"
            class="px-6 py-2 bg-white text-black font-black uppercase text-sm border-2 border-transparent hover:bg-coral-pink hover:border-white transition-all shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
            + Create Event
          </button>
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-4 py-12 relative z-10">
      <!-- 页面标题区 -->
      <div class="mb-16 border-l-4 border-coral-pink pl-6 py-2">
        <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-2">
          Your <br /> Events
        </h2>
        <p class="font-mono text-sm opacity-60 uppercase tracking-[0.2em]">/// Managed Activities Protocol</p>
      </div>

      <div v-if="loading" class="text-center py-20 font-mono animate-pulse">
        LOADING DATA...
      </div>

      <div v-else-if="events.length === 0"
        class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/20">
        <div class="w-16 h-16 border-4 border-white/20 rounded-full flex items-center justify-center mb-6">
          <span class="text-2xl opacity-50">?</span>
        </div>
        <p class="text-xl font-bold uppercase mb-6 opacity-50">No Signal Detected</p>
        <button @click="handleCreateEvent"
          class="px-8 py-4 bg-coral-pink text-black font-black uppercase tracking-widest border-4 border-black hover:bg-white transition-colors">
          Initialize First Event
        </button>
      </div>

      <!-- 事件列表 (网格布局) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div v-for="(event, index) in events" :key="event.id" @click="router.push(`/events/${event.id}`)"
          class="group relative bg-black border-2 border-white hover:border-coral-pink transition-colors cursor-pointer min-h-[300px] flex flex-col p-6">
          <!-- 卡片装饰 -->
          <div class="absolute top-4 right-4 font-mono text-xs opacity-50">NO.{{ String(index + 1).padStart(2, '0') }}
          </div>
          <div
            class="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white group-hover:border-coral-pink transition-colors">
          </div>

          <!-- 状态标签 -->
          <div class="mb-8">
            <span class="px-3 py-1 text-xs font-bold uppercase border border-current inline-block" :class="{
              'text-green-400 border-green-400': event.status === 'scheduled',
              'text-yellow-400 border-yellow-400': event.status === 'polling',
              'text-gray-400 border-gray-400': event.status === 'draft'
            }">
              {{ event.status }}
            </span>
          </div>

          <!-- 标题 -->
          <h3
            class="text-3xl font-black uppercase leading-tight mb-4 group-hover:text-coral-pink transition-colors break-words">
            {{ event.title }}
          </h3>

          <!-- 描述 -->
          <p class="text-sm opacity-60 font-mono line-clamp-3 mb-auto">
            {{ event.description || 'NO DESCRIPTION AVAILABLE' }}
          </p>

          <!-- 底部信息 -->
          <div class="pt-6 border-t border-white/10 mt-6 flex justify-between items-end">
            <div class="font-mono text-xs">
              <div v-if="event.start_time" class="flex flex-col">
                <span class="opacity-50 text-[10px] uppercase">Date</span>
                <span>{{ new Date(event.start_time).toLocaleDateString() }}</span>
              </div>
              <div v-else class="opacity-50 italic">TBD</div>
            </div>

            <div
              class="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-coral-pink group-hover:border-coral-pink group-hover:text-black transition-all">
              →
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
