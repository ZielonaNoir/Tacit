<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'
import type { TacitEvent } from '@/types/database'

const router = useRouter()
const { user, isAuthenticated, signOut } = useAuth()
const events = ref<TacitEvent[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }
    
    events.value = data || []
    console.log(`Loaded ${events.value.length} events`)
  } catch (err) {
    console.error('Error fetching events:', err)
    // Show error to user
    const errorMessage = err instanceof Error ? err.message : '未知错误'
    console.error('Full error details:', err)
    alert(`加载活动列表失败: ${errorMessage}`)
  } finally {
    loading.value = false
  }
})

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
            <button
              @click="handleLogout"
              class="text-xs font-bold uppercase tracking-widest hover:text-coral-pink transition-colors"
            >
              [ Log Out ]
            </button>
          </div>
          <div v-else class="flex gap-4">
            <router-link
              to="/login"
              class="text-sm font-bold uppercase tracking-wider hover:text-coral-pink transition-colors"
            >
              Log In
            </router-link>
            <router-link
              to="/register"
              class="text-sm font-bold uppercase tracking-wider hover:text-coral-pink transition-colors"
            >
              Register
            </router-link>
          </div>
          <button
            @click="handleCreateEvent"
            class="px-6 py-2 bg-white text-black font-black uppercase text-sm border-2 border-transparent hover:bg-coral-pink hover:border-white transition-all shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            + Create Event
          </button>
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-4 py-12 relative z-10">
      <!-- 页面标题区 -->
      <div class="mb-16 border-l-4 border-coral-pink pl-6 py-2">
        <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-2">
          Your <br/> Events
        </h2>
        <p class="font-mono text-sm opacity-60 uppercase tracking-[0.2em]">/// Managed Activities Protocol</p>
      </div>

      <div v-if="loading" class="text-center py-20 font-mono animate-pulse">
        LOADING DATA...
      </div>

      <div v-else-if="events.length === 0" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/20">
        <div class="w-16 h-16 border-4 border-white/20 rounded-full flex items-center justify-center mb-6">
          <span class="text-2xl opacity-50">?</span>
        </div>
        <p class="text-xl font-bold uppercase mb-6 opacity-50">No Signal Detected</p>
        <button
          @click="handleCreateEvent"
          class="px-8 py-4 bg-coral-pink text-black font-black uppercase tracking-widest border-4 border-black hover:bg-white transition-colors"
        >
          Initialize First Event
        </button>
      </div>

      <!-- 事件列表 (网格布局) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="(event, index) in events"
          :key="event.id"
          @click="router.push(`/events/${event.id}`)"
          class="group relative bg-black border-2 border-white hover:border-coral-pink transition-colors cursor-pointer min-h-[300px] flex flex-col p-6"
        >
          <!-- 卡片装饰 -->
          <div class="absolute top-4 right-4 font-mono text-xs opacity-50">NO.{{ String(index + 1).padStart(2, '0') }}</div>
          <div class="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white group-hover:border-coral-pink transition-colors"></div>

          <!-- 状态标签 -->
          <div class="mb-8">
            <span 
              class="px-3 py-1 text-xs font-bold uppercase border border-current inline-block"
              :class="{
                'text-green-400 border-green-400': event.status === 'scheduled',
                'text-yellow-400 border-yellow-400': event.status === 'polling',
                'text-gray-400 border-gray-400': event.status === 'draft'
              }"
            >
              {{ event.status }}
            </span>
          </div>

          <!-- 标题 -->
          <h3 class="text-3xl font-black uppercase leading-tight mb-4 group-hover:text-coral-pink transition-colors break-words">
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
            
            <div class="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-coral-pink group-hover:border-coral-pink group-hover:text-black transition-all">
              →
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

