import { supabase } from '@/lib/supabase'
import type { Activity } from '@/types/database'

export async function fetchActivities(eventId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Activity[]
}

export async function createActivity(
  eventId: string,
  type: 'blast' | 'comment' | 'photo' | 'rsvp_log',
  content: string | null,
  mediaUrl: string | null,
  identity: { user_id: string | null; guest_id: string | null }
) {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      event_id: eventId,
      ...identity,
      type,
      content,
      media_url: mediaUrl
    })
    .select()
    .single()

  if (error) throw error
  return data as Activity
}

export async function createRsvpLog(eventId: string, name: string, status: string, identity: { user_id: string | null; guest_id: string | null }) {
  return createActivity(
    eventId,
    'rsvp_log',
    `${name} is ${status}!`,
    null,
    identity
  )
}

