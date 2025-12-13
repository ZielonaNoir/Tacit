import { supabase } from '@/lib/supabase'
import type { TacitEvent, EventTimePoll, EventPollVote, RSVP } from '@/types/database'

export async function fetchEvent(id: string, inviteCode?: string) {
  // If invite code is provided, use RPC function to bypass RLS for private events
  if (inviteCode) {
    const { data, error } = await supabase
      .rpc('get_event_by_invite_code', { invite_code_param: inviteCode })
    
    if (error) {
      console.error('[fetchEvent] RPC error:', error)
      throw error
    }
    
    // RPC function returns a table, so we need to get the first row
    if (!data || data.length === 0) {
      throw new Error('Event not found or invalid invite code')
    }
    
    // Verify the event ID matches
    const event = data[0] as TacitEvent
    if (event.id !== id) {
      throw new Error('Invite code does not match event ID')
    }
    
    return event
  }
  
  // Normal fetch (subject to RLS)
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

// Batch fetch votes for multiple polls at once (much faster)
export async function fetchPollVotesForEvent(eventId: string, pollIds?: string[]) {
  let finalPollIds: string[] = []
  
  if (pollIds && pollIds.length > 0) {
    // Use provided poll IDs (avoids extra query)
    finalPollIds = pollIds
  } else {
    // First get all poll IDs for this event
    const { data: polls, error: pollsError } = await supabase
      .from('event_time_polls')
      .select('id')
      .eq('event_id', eventId)

    if (pollsError) throw pollsError

    if (!polls || polls.length === 0) {
      return {}
    }

    finalPollIds = polls.map(p => p.id)
  }

  // Early return if no poll IDs (avoid .in() with empty array)
  if (finalPollIds.length === 0) {
    return {}
  }

  // Fetch all votes for all polls in one query
  const { data: votes, error: votesError } = await supabase
    .from('event_poll_votes')
    .select('*')
    .in('poll_id', finalPollIds)

  if (votesError) throw votesError

  // Group votes by poll_id
  const votesByPoll: Record<string, EventPollVote[]> = {}
  for (const vote of (votes || [])) {
    if (!votesByPoll[vote.poll_id]) {
      votesByPoll[vote.poll_id] = []
    }
    votesByPoll[vote.poll_id].push(vote)
  }

  // Ensure all poll IDs have an array (even if empty)
  for (const pollId of finalPollIds) {
    if (!votesByPoll[pollId]) {
      votesByPoll[pollId] = []
    }
  }

  return votesByPoll
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
  // Build the RSVP data
  // IMPORTANT: Explicitly set user_id to null if not provided, to avoid unique constraint issues
  const rsvpData = {
    event_id: eventId,
    user_id: identity.user_id || null,
    guest_id: identity.guest_id || null,
    status,
    guests_count: options?.guests_count ?? 0,
    comment: options?.comment ?? null,
    phone_number: options?.phone_number ?? null
  }

  // First, check if RSVP already exists (optimize to avoid 409 conflicts)
  const { data: allRSVPs, error: fetchError } = await supabase
    .from('rsvps')
    .select('id, event_id, guest_id, user_id, status')
    .eq('event_id', eventId)
  
  if (fetchError) {
    console.error('[submitRSVP] Failed to fetch existing RSVPs:', fetchError)
    throw new Error(`Failed to check existing RSVPs: ${fetchError.message}`)
  }

  // Find existing RSVP
  const existingRSVP = allRSVPs?.find((r: any) => {
    if (identity.user_id && r.user_id) {
      return r.user_id === identity.user_id
    } else if (identity.guest_id && r.guest_id) {
      return String(r.guest_id) === String(identity.guest_id)
    }
    return false
  })

  // If RSVP exists, update it
  if (existingRSVP) {
    console.log('[submitRSVP] RSVP exists, updating:', existingRSVP.id)
    
    // Verify that we're updating the correct RSVP (security check)
    if (identity.user_id && existingRSVP.user_id !== identity.user_id) {
      throw new Error('Cannot update RSVP: user_id mismatch')
    }
    if (identity.guest_id && String(existingRSVP.guest_id) !== String(identity.guest_id)) {
      throw new Error('Cannot update RSVP: guest_id mismatch')
    }
    
    const { data: updatedRSVP, error: updateError } = await supabase
      .from('rsvps')
      .update({
        status,
        guests_count: options?.guests_count ?? 0,
        comment: options?.comment ?? null,
        phone_number: options?.phone_number ?? null
      })
      .eq('id', existingRSVP.id)
      // Add additional filter to ensure we're only updating matching records
      .eq(identity.user_id ? 'user_id' : 'guest_id', identity.user_id || identity.guest_id)
      .select()

    if (updateError) {
      console.error('[submitRSVP] Failed to update RSVP:', updateError)
      throw updateError
    }

    // Handle case where RLS might prevent returning the row
    if (!updatedRSVP || updatedRSVP.length === 0) {
      console.warn('[submitRSVP] Update succeeded but no row returned (RLS may be filtering), fetching manually')
      // Fetch the updated RSVP directly
      const { data: fetchedRSVP, error: fetchErr } = await supabase
        .from('rsvps')
        .select('*')
        .eq('id', existingRSVP.id)
        .single()
      
      if (fetchErr || !fetchedRSVP) {
        throw new Error('Update succeeded but could not verify result')
      }
      
      return fetchedRSVP as RSVP
    }

    return (updatedRSVP.length > 0 ? updatedRSVP[0] : updatedRSVP) as RSVP
  }

  // RSVP doesn't exist, insert new one
  console.log('[submitRSVP] No existing RSVP found, creating new one')
  
  const { data: insertData, error: insertError } = await supabase
    .from('rsvps')
    .insert(rsvpData)
    .select()
    .single()

  if (insertError) {
    console.error('[submitRSVP] Failed to insert RSVP:', insertError)
    throw insertError
  }

  return insertData as RSVP
}

export async function lockPollDate(eventId: string, startTime: string, endTime: string | null) {
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'scheduled',
      start_time: startTime,
      end_time: endTime
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(eventId: string, updates: Partial<TacitEvent>) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) throw error
  return data as TacitEvent
}

export async function deleteEvent(eventId: string) {
  console.log('[deleteEvent] Starting deletion of event:', eventId)
  
  try {
    // Step 1: Delete poll votes (via polls)
    const { data: polls } = await supabase
      .from('event_time_polls')
      .select('id')
      .eq('event_id', eventId)
    
    if (polls && polls.length > 0) {
      const pollIds = polls.map(p => p.id)
      console.log('[deleteEvent] Deleting poll votes for polls:', pollIds)
      
      const { error: votesError } = await supabase
        .from('event_poll_votes')
        .delete()
        .in('poll_id', pollIds)
      
      if (votesError) {
        console.error('[deleteEvent] Error deleting poll votes:', votesError)
        throw votesError
      }
    }
    
    // Step 2: Delete polls
    console.log('[deleteEvent] Deleting polls')
    const { error: pollsError } = await supabase
      .from('event_time_polls')
      .delete()
      .eq('event_id', eventId)
    
    if (pollsError) {
      console.error('[deleteEvent] Error deleting polls:', pollsError)
      throw pollsError
    }
    
    // Step 3: Delete activities
    console.log('[deleteEvent] Deleting activities')
    const { error: activitiesError } = await supabase
      .from('activities')
      .delete()
      .eq('event_id', eventId)
    
    if (activitiesError) {
      console.error('[deleteEvent] Error deleting activities:', activitiesError)
      throw activitiesError
    }
    
    // Step 4: Delete RSVPs
    console.log('[deleteEvent] Deleting RSVPs')
    const { error: rsvpsError } = await supabase
      .from('rsvps')
      .delete()
      .eq('event_id', eventId)
    
    if (rsvpsError) {
      console.error('[deleteEvent] Error deleting RSVPs:', rsvpsError)
      throw rsvpsError
    }
    
    // Step 5: Delete invite cards (if table exists)
    try {
      const { error: inviteCardsError } = await supabase
        .from('invite_cards')
        .delete()
        .eq('event_id', eventId)
      
      if (inviteCardsError && inviteCardsError.code !== '42P01') { // 42P01 = table does not exist
        console.error('[deleteEvent] Error deleting invite cards:', inviteCardsError)
        throw inviteCardsError
      }
    } catch (err: any) {
      // Ignore if table doesn't exist
      if (err.code !== '42P01') {
        console.warn('[deleteEvent] Could not delete invite cards (table may not exist):', err)
      }
    }
    
    // Step 6: Delete notifications (if table exists)
    try {
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('event_id', eventId)
      
      if (notificationsError && notificationsError.code !== '42P01') {
        console.error('[deleteEvent] Error deleting notifications:', notificationsError)
        throw notificationsError
      }
    } catch (err: any) {
      if (err.code !== '42P01') {
        console.warn('[deleteEvent] Could not delete notifications (table may not exist):', err)
      }
    }
    
    // Step 7: Delete user availability (if table exists)
    try {
      const { error: availabilityError } = await supabase
        .from('user_availability')
        .delete()
        .eq('event_id', eventId)
      
      if (availabilityError && availabilityError.code !== '42P01') {
        console.error('[deleteEvent] Error deleting user availability:', availabilityError)
        throw availabilityError
      }
    } catch (err: any) {
      if (err.code !== '42P01') {
        console.warn('[deleteEvent] Could not delete user availability (table may not exist):', err)
      }
    }
    
    // Step 8: Finally, delete the event itself
    console.log('[deleteEvent] Deleting event')
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    
    if (eventError) {
      console.error('[deleteEvent] Error deleting event:', eventError)
      throw eventError
    }
    
    console.log('[deleteEvent] Successfully deleted event and all dependencies')
  } catch (err) {
    console.error('[deleteEvent] Failed to delete event:', err)
    throw err
  }
}

export async function deleteEventPolls(eventId: string) {
  console.log('[deleteEventPolls] Deleting polls for event:', eventId)
  
  // First, get all poll IDs for this event
  const { data: existingPolls, error: fetchError } = await supabase
    .from('event_time_polls')
    .select('id')
    .eq('event_id', eventId)
  
  if (fetchError) {
    console.error('[deleteEventPolls] Error fetching existing polls:', fetchError)
    throw fetchError
  }
  
  console.log(`[deleteEventPolls] Found ${existingPolls?.length || 0} existing polls to delete`)
  
  if (existingPolls && existingPolls.length > 0) {
    const pollIds = existingPolls.map(poll => poll.id)
    
    // Step 1: Delete all votes for these polls first (to avoid foreign key constraint)
    console.log('[deleteEventPolls] Deleting votes for polls:', pollIds)
    const { error: votesError } = await supabase
      .from('event_poll_votes')
      .delete()
      .in('poll_id', pollIds)
    
    if (votesError) {
      console.error('[deleteEventPolls] Error deleting votes:', votesError)
      throw votesError
    }
    
    console.log('[deleteEventPolls] Successfully deleted votes')
  }
  
  // Step 2: Delete all polls for this event
  const { data, error } = await supabase
    .from('event_time_polls')
    .delete()
    .eq('event_id', eventId)
    .select()
  
  if (error) {
    console.error('[deleteEventPolls] Error deleting polls:', error)
    throw error
  }
  
  console.log(`[deleteEventPolls] Successfully deleted ${data?.length || 0} polls`)
  return { deleted: data?.length || 0 }
}
