import { supabase } from '@/lib/supabase'
import type { TacitEvent, EventTimePoll, EventPollVote, RSVP } from '@/types/database'

export async function fetchEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as TacitEvent
}

export async function fetchEventPolls(eventId: string) {
  const { data, error } = await supabase
    .from('event_time_polls')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data as EventTimePoll[]
}

export async function fetchPollVotes(pollId: string) {
  const { data, error } = await supabase
    .from('event_poll_votes')
    .select('*')
    .eq('poll_id', pollId)

  if (error) throw error
  return data as EventPollVote[]
}

export async function submitPollVote(
  pollId: string,
  status: 'yes' | 'if_need_be' | 'no',
  identity: { user_id: string | null; guest_id: string | null }
) {
  // Check if vote already exists
  const existingVote = identity.user_id
    ? await supabase
        .from('event_poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', identity.user_id)
        .single()
    : await supabase
        .from('event_poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('guest_id', identity.guest_id)
        .single()

  if (existingVote.data) {
    // Update existing vote
    const { data, error } = await supabase
      .from('event_poll_votes')
      .update({ status })
      .eq('id', existingVote.data.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new vote
    const { data, error } = await supabase
      .from('event_poll_votes')
      .insert({
        poll_id: pollId,
        ...identity,
        status
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function fetchRSVPs(eventId: string) {
  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as RSVP[]
}

export async function submitRSVP(
  eventId: string,
  status: 'going' | 'maybe' | 'not_going' | 'waitlist',
  identity: { user_id: string | null; guest_id: string | null },
  options?: {
    guests_count?: number
    comment?: string
    phone_number?: string
  }
) {
  // Check if RSVP already exists
  let existingRSVP = null
  if (identity.user_id) {
    const { data } = await supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', identity.user_id)
      .single()
    existingRSVP = data
  } else {
    const { data } = await supabase
      .from('rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('guest_id', identity.guest_id)
      .single()
    existingRSVP = data
  }

  if (existingRSVP) {
    // Update existing RSVP
    const { data, error } = await supabase
      .from('rsvps')
      .update({
        status,
        guests_count: options?.guests_count ?? 0,
        comment: options?.comment ?? null,
        phone_number: options?.phone_number ?? null
      })
      .eq('id', existingRSVP.id)
      .select()
      .single()

    if (error) throw error
    return data as RSVP
  } else {
    // Create new RSVP
    const { data, error } = await supabase
      .from('rsvps')
      .insert({
        event_id: eventId,
        ...identity,
        status,
        guests_count: options?.guests_count ?? 0,
        comment: options?.comment ?? null,
        phone_number: options?.phone_number ?? null
      })
      .select()
      .single()

    if (error) throw error
    return data as RSVP
  }
}

