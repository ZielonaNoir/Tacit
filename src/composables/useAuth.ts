import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

const user = ref<User | null>(null)
const profile = ref<Profile | null>(null)
const loading = ref(true)

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  user.value = session?.user ?? null
  if (user.value) {
    fetchProfile()
  } else {
    loading.value = false
  }
})

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
  user.value = session?.user ?? null
  if (user.value) {
    fetchProfile()
  } else {
    profile.value = null
    loading.value = false
  }
})

async function fetchProfile() {
  if (!user.value) {
    profile.value = null
    return
  }

  try {
    // 使用显式字段列表避免 406 错误
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, phone_number, social_links, created_at')
      .eq('id', user.value.id)
      .maybeSingle()

    if (error) throw error
    
    // 如果 profile 不存在，创建它
    if (!data) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.value.id,
          full_name: user.value.user_metadata?.full_name || null,
          username: user.value.user_metadata?.username || null
        })
        .select('id, username, full_name, avatar_url, phone_number, social_links, created_at')
        .single()
      
      if (createError) {
        console.error('Error creating profile:', createError)
        profile.value = null
      } else {
        profile.value = newProfile
      }
    } else {
      profile.value = data
    }
  } catch (err) {
    console.error('Error fetching profile:', err)
    profile.value = null
  } finally {
    loading.value = false
  }
}

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    
    // 登录后刷新 profile
    if (data.user) {
      await fetchProfile()
    }
    
    return data
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    profile.value = null
  }

  return {
    user: computed(() => user.value),
    profile: computed(() => profile.value),
    isAuthenticated,
    loading: computed(() => loading.value),
    signIn,
    signUp,
    signOut
  }
}

