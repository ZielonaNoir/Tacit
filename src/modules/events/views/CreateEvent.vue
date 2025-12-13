<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, isAuthenticated, loading: authLoading } = useAuth()

const title = ref('')
const description = ref('')
const loading = ref(false)

// 如果未登录，路由守卫会处理重定向，这里作为双重保护
watch([isAuthenticated, authLoading], ([authenticated, loading]) => {
  if (!loading && !authenticated) {
    router.push({ name: 'login', query: { redirect: '/events/create' } })
  }
}, { immediate: true })

const createEvent = async () => {
  if (!title.value.trim()) {
    alert('请输入活动标题')
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
      // 如果 profile 不存在，先创建它
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.value.id,
          full_name: user.value.user_metadata?.full_name || null,
          username: user.value.user_metadata?.username || null
        })
      
      if (profileError) {
        console.error('Error creating profile:', profileError)
        alert('无法创建用户资料，请重试')
        return
      }
    }

    // 创建活动
    const { data, error } = await supabase
      .from('events')
      .insert({
        creator_id: user.value.id,
        title: title.value,
        description: description.value || null,
        status: 'draft',
        theme_config: {},
        modules_config: {}
      })
      .select()
      .single()

    if (error) throw error
    
    router.push(`/events/${data.id}`)
  } catch (err: any) {
    console.error('Error creating event:', err)
    const errorMessage = err.message || '创建活动失败，请重试'
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface-light">
    <div class="container mx-auto px-4 py-8 max-w-2xl">
      <div class="bg-white border-2 border-black shadow-retro p-8">
        <h1 class="text-4xl font-heading font-bold mb-6">创建活动</h1>
        
        <form @submit.prevent="createEvent" class="space-y-6">
          <div>
            <label class="block font-semibold mb-2">活动标题 *</label>
            <input
              v-model="title"
              type="text"
              required
              class="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-brand-orange"
              placeholder="例如：周末聚餐"
            />
          </div>

          <div>
            <label class="block font-semibold mb-2">活动描述</label>
            <textarea
              v-model="description"
              rows="5"
              class="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
              placeholder="描述你的活动..."
            ></textarea>
          </div>

          <div class="flex gap-4">
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-3 bg-brand-orange text-white font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? '创建中...' : '创建活动' }}
            </button>
            <button
              type="button"
              @click="router.push('/')"
              class="px-6 py-3 bg-gray-200 text-black font-semibold shadow-retro border-2 border-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

