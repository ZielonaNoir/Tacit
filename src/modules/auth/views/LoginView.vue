<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { signIn, isAuthenticated } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

// 如果已登录，重定向
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    const redirectTo = (route.query.redirect as string) || '/'
    router.push(redirectTo)
  }
}, { immediate: true })

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = '请输入邮箱和密码'
    return
  }

  loading.value = true
  error.value = ''
  
  try {
    await signIn(email.value, password.value)
    // 登录成功后会通过 watch 自动重定向
  } catch (err: any) {
    error.value = err.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
    <!-- 装饰性点状效果 -->
    <div class="absolute inset-0 pointer-events-none opacity-20">
      <div class="absolute top-20 left-10 w-2 h-2 bg-coral-pink rounded-full"></div>
      <div class="absolute top-40 right-20 w-1 h-1 bg-coral-pink rounded-full"></div>
      <div class="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-coral-pink rounded-full"></div>
      <div class="absolute bottom-20 right-1/3 w-2 h-2 bg-coral-pink rounded-full"></div>
      <div class="absolute top-1/2 left-20 w-1 h-1 bg-coral-pink rounded-full"></div>
      <div class="absolute top-1/3 right-10 w-1.5 h-1.5 bg-coral-pink rounded-full"></div>
    </div>

    <!-- 顶部装饰条 -->
    <div class="absolute top-0 left-0 right-0 h-1 bg-coral-pink">
      <div class="h-full w-1/3 bg-white"></div>
    </div>

    <div class="relative z-10 w-full max-w-lg">
      <!-- 主卡片 - 黑色背景 -->
      <div class="bg-black border-4 border-coral-pink shadow-[8px_8px_0_0_#FF8A95] p-8 relative">
        <!-- 左上角装饰块 -->
        <div class="absolute -top-4 -left-4 w-16 h-16 bg-coral-pink border-4 border-black flex items-center justify-center">
          <div class="w-8 h-8 border-2 border-black rotate-45"></div>
        </div>

        <!-- 标题区域 -->
        <div class="mb-8 pt-4">
          <h1 class="text-6xl font-bold text-white mb-2 tracking-tight" style="font-family: 'Inter', sans-serif; letter-spacing: -0.05em;">
            SIGN IN
          </h1>
          <div class="h-1 w-24 bg-coral-pink mb-4"></div>
          <p class="text-white text-lg opacity-80">THE RAW FORM</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div v-if="error" class="bg-coral-pink border-4 border-black text-black px-4 py-3">
            <p class="font-bold text-sm">{{ error }}</p>
          </div>

          <div>
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">EMAIL</label>
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
            <label class="block font-bold mb-3 text-white text-sm uppercase tracking-wider">PASSWORD</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-4 border-4 border-white bg-black text-white placeholder-white/50 focus:outline-none focus:border-coral-pink font-bold pr-16"
                placeholder="••••••••"
                autocomplete="current-password"
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

          <!-- 波形装饰 -->
          <div class="relative h-8 overflow-hidden">
            <svg class="w-full h-full" viewBox="0 0 200 30" preserveAspectRatio="none">
              <path d="M0,15 Q50,5 100,15 T200,15" stroke="white" stroke-width="2" fill="none"/>
              <circle cx="50" cy="5" r="2" fill="white"/>
              <circle cx="100" cy="15" r="2" fill="white"/>
              <circle cx="150" cy="5" r="2" fill="white"/>
            </svg>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full px-6 py-5 bg-coral-pink text-black font-black text-xl border-4 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 uppercase tracking-wider"
          >
            {{ loading ? 'LOADING...' : 'SIGN IN' }}
          </button>
        </form>

        <!-- 分隔线 -->
        <div class="mt-8 pt-6 border-t-4 border-white">
          <div class="flex items-center justify-center gap-4">
            <div class="h-1 w-12 bg-coral-pink"></div>
            <p class="text-white font-bold text-sm uppercase tracking-wider">
              NO ACCOUNT?
            </p>
            <div class="h-1 w-12 bg-coral-pink"></div>
          </div>
          <div class="text-center mt-4">
            <router-link
              :to="{ name: 'register', query: route.query }"
              class="inline-block px-6 py-3 bg-white text-black font-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-1 hover:translate-y-1 transition-all uppercase text-sm tracking-wider"
            >
              REGISTER
            </router-link>
          </div>
        </div>

        <div v-if="route.query.registered === 'true'" class="mt-4 bg-white border-4 border-black text-black px-4 py-3">
          <p class="font-bold text-center text-sm">REGISTRATION SUCCESSFUL! PLEASE SIGN IN</p>
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

        <!-- 底部装饰 - 条形码样式 -->
        <div class="mt-8 pt-4 border-t-2 border-white/30">
          <div class="flex gap-1 h-8">
            <div class="flex-1 bg-white"></div>
            <div class="w-1 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-2 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-1 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
            <div class="w-3 bg-coral-pink"></div>
            <div class="flex-1 bg-white"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部装饰条 -->
    <div class="absolute bottom-0 left-0 right-0 h-1 bg-coral-pink">
      <div class="h-full w-2/3 bg-white flex gap-2">
        <div class="h-full w-2 bg-black"></div>
        <div class="h-full w-2 bg-black"></div>
        <div class="h-full w-2 bg-black"></div>
      </div>
    </div>
  </div>
</template>
