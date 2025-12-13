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

    if (error) throw error
    events.value = data || []
  } catch (err) {
    console.error('Error fetching events:', err)
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
  <div class="min-h-screen bg-surface-light">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-4xl font-heading font-bold">Tacit</h1>
        <div class="flex gap-3 items-center">
          <div v-if="isAuthenticated && user" class="flex items-center gap-3">
            <div class="text-right">
              <p class="font-semibold">{{ user.email }}</p>
            </div>
            <button
              @click="handleLogout"
              class="px-4 py-2 bg-gray-200 text-black font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-sm"
            >
              退出
            </button>
          </div>
          <div v-else class="flex gap-3">
            <router-link
              to="/login"
              class="px-4 py-2 bg-gray-200 text-black font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              登录
            </router-link>
            <router-link
              to="/register"
              class="px-4 py-2 bg-brand-purple text-white font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              注册
            </router-link>
          </div>
          <button
            @click="handleCreateEvent"
            class="px-6 py-3 bg-brand-orange text-white font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            创建活动
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">加载中...</p>
      </div>

      <div v-else-if="events.length === 0" class="text-center py-12">
        <p class="text-gray-500 mb-4">还没有活动</p>
        <button
          @click="handleCreateEvent"
          class="px-6 py-3 bg-brand-purple text-white font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          创建第一个活动
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="event in events"
          :key="event.id"
          @click="router.push(`/events/${event.id}`)"
          class="bg-white border-2 border-black shadow-retro p-6 cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
        >
          <h2 class="text-xl font-heading font-bold mb-2">{{ event.title }}</h2>
          <p class="text-gray-600 mb-4 line-clamp-2">{{ event.description }}</p>
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>{{ event.status }}</span>
            <span v-if="event.start_time">
              {{ new Date(event.start_time).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

