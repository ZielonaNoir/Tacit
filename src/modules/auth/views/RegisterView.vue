<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()
const { isAuthenticated } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const fullName = ref('')
const username = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 如果已登录，重定向
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    router.push('/')
  }
}, { immediate: true })

const handleRegister = async () => {
  // 验证
  if (!email.value || !password.value || !fullName.value) {
    error.value = '请填写所有必填项'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码长度至少为6位'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  error.value = ''
  
  try {
    // 注册用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          full_name: fullName.value,
          username: username.value || null
        }
      }
    })

    if (authError) throw authError

    // 创建 profile
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName.value,
          username: username.value || null
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // 即使 profile 创建失败，用户也已经注册，可以登录
      }
    }

    // 注册成功后跳转到登录页
    router.push({ name: 'login', query: { ...route.query, registered: 'true' } })
  } catch (err: any) {
    error.value = err.message || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
    <!-- 装饰性点状效果 -->
    <div class="absolute inset-0 pointer-events-none opacity-20">
      <div class="absolute top-16 left-16 w-2 h-2 bg-coral-pink rounded-full"></div>
      <div class="absolute top-32 right-16 w-1 h-1 bg-coral-pink rounded-full"></div>
      <div class="absolute bottom-40 left-1/3 w-1.5 h-1.5 bg-coral-pink rounded-full"></div>
      <div class="absolute bottom-24 right-1/4 w-2 h-2 bg-coral-pink rounded-full"></div>
      <div class="absolute top-1/2 left-16 w-1 h-1 bg-coral-pink rounded-full"></div>
      <div class="absolute top-1/4 right-12 w-1.5 h-1.5 bg-coral-pink rounded-full"></div>
      <div class="absolute bottom-16 left-1/2 w-2 h-2 bg-coral-pink rounded-full"></div>
    </div>

    <!-- 顶部装饰条 -->
    <div class="absolute top-0 left-0 right-0 h-1 bg-coral-pink">
      <div class="h-full w-2/5 bg-white"></div>
    </div>

    <div class="relative z-10 w-full max-w-lg">
      <!-- 主卡片 - 黑色背景 -->
      <div class="bg-black border-4 border-coral-pink shadow-[8px_8px_0_0_#FF8A95] p-8 relative">
        <!-- 右上角装饰块 -->
        <div class="absolute -top-4 -right-4 w-20 h-20 bg-white border-4 border-black flex items-center justify-center">
          <div class="w-12 h-12 border-4 border-black"></div>
        </div>

        <!-- 标题区域 -->
        <div class="mb-8 pt-4">
          <h1 class="text-6xl font-black text-white mb-2 tracking-tight" style="font-family: 'Inter', sans-serif; letter-spacing: -0.05em;">
            REGISTER
          </h1>
          <div class="h-1 w-32 bg-coral-pink mb-4"></div>
          <p class="text-white text-lg opacity-80">GEOMETRY OF STRENGTH</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="space-y-5">
          <div v-if="error" class="bg-coral-pink border-4 border-black text-black px-4 py-3">
            <p class="font-bold text-sm">{{ error }}</p>
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">FULL NAME <span class="text-coral-pink">*</span></label>
            <input
              v-model="fullName"
              type="text"
              required
              class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
              placeholder="YOUR NAME"
              autocomplete="name"
              style="letter-spacing: 0.05em;"
            />
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">USERNAME</label>
            <input
              v-model="username"
              type="text"
              class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
              placeholder="OPTIONAL"
              autocomplete="username"
              style="letter-spacing: 0.05em;"
            />
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">EMAIL <span class="text-coral-pink">*</span></label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold"
              placeholder="YOUR@EMAIL.COM"
              autocomplete="email"
              style="letter-spacing: 0.05em;"
            />
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">PASSWORD <span class="text-coral-pink">*</span></label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold pr-16"
                placeholder="MIN 6 CHARS"
                autocomplete="new-password"
                style="letter-spacing: 0.2em;"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white font-bold text-sm hover:text-coral-pink"
              >
                {{ showPassword ? 'HIDE' : 'SHOW' }}
              </button>
            </div>
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">CONFIRM PASSWORD <span class="text-coral-pink">*</span></label>
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold pr-16"
                placeholder="CONFIRM PASSWORD"
                autocomplete="new-password"
                style="letter-spacing: 0.2em;"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white font-bold text-sm hover:text-coral-pink"
              >
                {{ showConfirmPassword ? 'HIDE' : 'SHOW' }}
              </button>
            </div>
          </div>

          <!-- 几何装饰 - 线框球 -->
          <div class="relative h-16 overflow-hidden flex items-center justify-center">
            <svg class="w-24 h-24" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
              <circle cx="50" cy="50" r="30" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
              <line x1="50" y1="10" x2="50" y2="90" stroke="white" stroke-width="2" opacity="0.3"/>
              <line x1="10" y1="50" x2="90" y2="50" stroke="white" stroke-width="2" opacity="0.3"/>
              <circle cx="50" cy="50" r="3" fill="coral-pink"/>
            </svg>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-6 py-5 bg-coral-pink text-black font-black text-xl border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 uppercase tracking-wider"
          >
            {{ loading ? 'CREATING...' : 'REGISTER' }}
          </button>
        </form>

        <!-- 分隔线 -->
        <div class="mt-8 pt-6 border-t-4 border-white">
          <div class="flex items-center justify-center gap-4">
            <div class="h-1 w-12 bg-coral-pink"></div>
            <p class="text-white font-bold text-sm uppercase tracking-wider">
              HAVE ACCOUNT?
            </p>
            <div class="h-1 w-12 bg-coral-pink"></div>
          </div>
          <div class="text-center mt-4">
            <router-link
              :to="{ name: 'login', query: route.query }"
              class="inline-block px-6 py-3 bg-white text-black font-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase text-sm tracking-wider"
            >
              SIGN IN
            </router-link>
          </div>
        </div>

        <!-- 返回链接 -->
        <div class="mt-6 text-center">
          <router-link
            to="/"
            class="text-white/60 hover:text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2"
          >
            <span>←</span> <span>BACK HOME</span>
          </router-link>
        </div>

        <!-- 底部装饰 - 复杂条形码 -->
        <div class="mt-8 pt-4 border-t-2 border-white/30">
          <div class="text-white text-xs font-bold mb-2 text-center uppercase tracking-widest opacity-60">MONOLITH VISION</div>
          <div class="flex gap-1 h-10">
            <div class="flex-1 bg-white"></div>
            <div class="w-1 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-2 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-1 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-3 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-1 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-2 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部装饰条 -->
    <div class="absolute bottom-0 left-0 right-0 h-1 bg-coral-pink">
      <div class="h-full w-3/4 bg-white flex gap-2">
        <div class="h-full w-2 bg-black"></div>
        <div class="h-full w-2 bg-black"></div>
        <div class="h-full w-2 bg-black"></div>
        <div class="h-full w-2 bg-black"></div>
      </div>
    </div>
  </div>
</template>
