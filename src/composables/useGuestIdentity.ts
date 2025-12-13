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
  // IMPORTANT: Each browser/domain has its own localStorage
  // - Different browsers → Different guest_id (e.g., Chrome vs Firefox)
  // - Same browser, different domains → Different guest_id (localhost:5173 vs production)
  // - Same browser, same domain, different tabs → SAME guest_id (shared localStorage)
  // - If localStorage is cleared → New guest_id generated on next visit
  const guestStore = useLocalStorage<GuestStore>('tacit-guest-v1', {
    id: uuidv4(), // UUIDv4 generates a random, unique identifier
    display_name: '',
    last_active: new Date().toISOString()
  })

  // Debug: Log guest_id for troubleshooting
  if (import.meta.env.DEV) {
    console.log('[GuestIdentity] Current guest_id:', guestStore.value.id)
  }

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

  // Ensure guest identity exists in database (required before RSVP/comments)
  // This creates a UNIQUE record in the database for THIS browser's guest_id
  const ensureGuestExists = async () => {
    if (guestStore.value.display_name) {
      // Already has a name, ensure it's synced
      await updateGuestProfile(guestStore.value.display_name)
      return
    }

    // No name yet, create with a placeholder
    const placeholderName = 'Guest'
    try {
      // UPSERT: If guest_id already exists in DB, update it; otherwise create new record
      // This ensures each unique guest_id gets its own database row
      const { data, error } = await supabase
        .from('guest_identities')
        .upsert({
          id: guestStore.value.id, // This is the unique UUID from localStorage
          display_name: placeholderName,
          last_active_at: new Date().toISOString()
        }, {
          onConflict: 'id' // If this id already exists, update instead of insert
        })
        .select()
        .single()

      if (error) {
        console.error('[GuestIdentity] Failed to ensure guest identity:', error)
        console.error('[GuestIdentity] Guest ID:', guestStore.value.id)
        throw error
      }

      if (import.meta.env.DEV) {
        console.log('[GuestIdentity] Guest identity ensured in DB:', data)
      }

      // Update local storage with placeholder
      guestStore.value.display_name = placeholderName
      guestStore.value.last_active = new Date().toISOString()
    } catch (err) {
      console.error('[GuestIdentity] Error ensuring guest identity:', err)
      throw err
    }
  }

  // Returns the payload for DB inserts (RSVPs, Votes)
  // Logic: "Who am I? User ID or Guest ID?"
  // IMPORTANT: For guests, call ensureGuestExists() before using this in DB operations
  const getIdentityPayload = (userId?: string | null) => {
    if (userId) return { user_id: userId, guest_id: null }
    return { user_id: null, guest_id: guestStore.value.id }
  }

  // Helper: Get identity payload AND ensure guest exists if needed
  const getIdentityPayloadSafe = async (userId?: string | null) => {
    if (userId) return { user_id: userId, guest_id: null }
    // Ensure guest exists in DB before returning
    await ensureGuestExists()
    return { user_id: null, guest_id: guestStore.value.id }
  }

  return {
    guestId: computed(() => guestStore.value.id),
    guestName: computed(() => guestStore.value.display_name),
    isGuestSetup,
    updateGuestProfile,
    ensureGuestExists,
    getIdentityPayload,
    getIdentityPayloadSafe, // Use this for DB operations to auto-ensure guest exists
    // Raw values for convenience
    rawGuestId: guestStore.value.id,
    rawGuestName: computed(() => guestStore.value.display_name)
  }
}

