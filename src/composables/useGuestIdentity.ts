import { useLocalStorage } from '@vueuse/core'
import { v4 as uuidv4 } from 'uuid'
import { computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface GuestStore {
  id: string
  display_name: string
  last_active: string
}

export function useGuestIdentity() {
  // Persist in localStorage
  const guestStore = useLocalStorage<GuestStore>('tacit-guest-v1', {
    id: uuidv4(),
    display_name: '',
    last_active: new Date().toISOString()
  })

  const isGuestSetup = computed(() => !!guestStore.value.display_name)

  const updateGuestProfile = async (name: string) => {
    guestStore.value.display_name = name
    guestStore.value.last_active = new Date().toISOString()
    
    // Sync to backend 'guest_identities' table
    try {
      const { error } = await supabase
        .from('guest_identities')
        .upsert({
          id: guestStore.value.id,
          display_name: name,
          last_active_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Failed to sync guest identity:', error)
      }
    } catch (err) {
      console.error('Error syncing guest identity:', err)
    }
  }

  // Returns the payload for DB inserts (RSVPs, Votes)
  // Logic: "Who am I? User ID or Guest ID?"
  const getIdentityPayload = (userId?: string | null) => {
    if (userId) return { user_id: userId, guest_id: null }
    return { user_id: null, guest_id: guestStore.value.id }
  }

  return {
    guestId: computed(() => guestStore.value.id),
    guestName: computed(() => guestStore.value.display_name),
    isGuestSetup,
    updateGuestProfile,
    getIdentityPayload,
    // Raw values for convenience
    rawGuestId: guestStore.value.id,
    rawGuestName: computed(() => guestStore.value.display_name)
  }
}

