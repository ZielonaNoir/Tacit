import { supabase } from '@/lib/supabase'
import type { InviteCard, Notification, UserAvailability, AvailabilitySlot, FreeTimeWindow } from '@/types/database'

/**
 * 计算多个参与者的空闲时间窗口（重叠时间）
 * 
 * 算法说明：
 * 1. 收集所有参与者的所有时间段
 * 2. 只考虑有有效 RSVP（going/maybe）的参与者
 * 3. 计算所有参与者的时间段的交集（所有参与者都可用）
 * 4. 对于重叠的时间段，真正的结束时间是所有重叠时间段中最小的结束时间
 */
export function calculateFreeTimeWindows(
  availabilities: UserAvailability[],
  validRSVPs?: Array<{ user_id: string | null; guest_id: string | null }>
): FreeTimeWindow[] {
  if (availabilities.length === 0) return []

  // 如果有 RSVP 列表，过滤掉没有有效 RSVP 的参与者
  let filteredAvailabilities = availabilities
  if (validRSVPs && validRSVPs.length > 0) {
    const validIds = new Set<string>()
    validRSVPs.forEach(rsvp => {
      if (rsvp.user_id) validIds.add(`user:${rsvp.user_id}`)
      if (rsvp.guest_id) validIds.add(`guest:${rsvp.guest_id}`)
    })
    
    filteredAvailabilities = availabilities.filter(avail => {
      const id = avail.user_id ? `user:${avail.user_id}` : `guest:${avail.guest_id}`
      return validIds.has(id)
    })
  }

  if (filteredAvailabilities.length === 0) return []

  // 收集每个参与者的时间段
  const participantSlots: Array<Array<{ start: Date; end: Date; participantId: string }>> = []
  
  filteredAvailabilities.forEach(avail => {
    const participantId = avail.user_id || avail.guest_id || ''
    const slots = avail.available_slots.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      participantId
    }))
    if (slots.length > 0) {
      participantSlots.push(slots)
    }
  })

  if (participantSlots.length === 0) return []

  // 从第一个参与者开始，逐步计算与后续参与者的交集
  let result: Array<{ start: Date; end: Date; participants: string[] }> = participantSlots[0].map(slot => ({
    start: slot.start,
    end: slot.end,
    participants: [slot.participantId]
  }))

  // 依次与每个参与者的时间段求交集
  for (let i = 1; i < participantSlots.length; i++) {
    const newResult: Array<{ start: Date; end: Date; participants: string[] }> = []
    
    for (const existing of result) {
      for (const slot of participantSlots[i]) {
        const overlapStart = new Date(Math.max(existing.start.getTime(), slot.start.getTime()))
        const overlapEnd = new Date(Math.min(existing.end.getTime(), slot.end.getTime()))

        if (overlapStart < overlapEnd) {
          newResult.push({
            start: overlapStart,
            end: overlapEnd,
            participants: [...existing.participants, slot.participantId]
          })
        }
      }
    }
    
    result = newResult
  }

  // 合并相邻或重叠的窗口（相同的参与者集合）
  const merged: FreeTimeWindow[] = []
  const sortedResult = result.sort((a, b) => a.start.getTime() - b.start.getTime())

  for (const window of sortedResult) {
    // 检查是否与最后一个窗口可以合并
    if (merged.length > 0) {
      const lastWindow = merged[merged.length - 1]
      const lastEnd = new Date(lastWindow.end).getTime()
      const currentStart = window.start.getTime()
      
      // 如果参与者相同且时间相邻或重叠，则合并
      const sameParticipants = 
        lastWindow.participants.length === window.participants.length &&
        lastWindow.participants.every(p => window.participants.includes(p)) &&
        window.participants.every(p => lastWindow.participants.includes(p))
      
      if (sameParticipants && currentStart <= lastEnd + 1000) { // 允许1秒的间隙，视为连续
        // 合并：取较大的结束时间（扩展窗口）
        const currentEnd = window.end.getTime()
        lastWindow.end = new Date(Math.max(lastEnd, currentEnd)).toISOString()
        continue
      }
    }

    // 创建新窗口
    merged.push({
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      participants: window.participants,
      participant_count: window.participants.length
    })
  }

  return merged
}

/**
 * 获取活动的所有用户可用时间
 */
export async function fetchEventAvailabilities(eventId: string): Promise<UserAvailability[]> {
  const { data, error } = await supabase
    .from('user_availability')
    .select('*')
    .eq('event_id', eventId)

  if (error) throw error
  return data as UserAvailability[]
}

/**
 * 提交用户可用时间
 */
export async function submitAvailability(
  eventId: string,
  slots: AvailabilitySlot[],
  identity: { user_id: string | null; guest_id: string | null }
): Promise<UserAvailability> {
  // 检查是否已存在
  let query = supabase
    .from('user_availability')
    .select('*')
    .eq('event_id', eventId)

  if (identity.user_id) {
    query = query.eq('user_id', identity.user_id)
  } else if (identity.guest_id) {
    query = query.eq('guest_id', identity.guest_id)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    // 更新现有记录
    const { data, error } = await supabase
      .from('user_availability')
      .update({
        available_slots: slots,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data as UserAvailability
  } else {
    // 创建新记录
    const { data, error } = await supabase
      .from('user_availability')
      .insert({
        event_id: eventId,
        user_id: identity.user_id || null,
        guest_id: identity.guest_id || null,
        available_slots: slots
      })
      .select()
      .single()

    if (error) throw error
    return data as UserAvailability
  }
}

/**
 * 生成邀请卡
 */
export async function generateInviteCard(
  eventId: string,
  identity?: { user_id: string | null; guest_id: string | null }
): Promise<InviteCard> {
  // 生成唯一邀请码
  const inviteCode = await generateInviteCode()
  const baseUrl = window.location.origin
  const inviteLink = `${baseUrl}/events/${eventId}/invite/${inviteCode}`

  const { data, error } = await supabase
    .from('invite_cards')
    .insert({
      event_id: eventId,
      user_id: identity?.user_id || null,
      guest_id: identity?.guest_id || null,
      invite_code: inviteCode,
      invite_link: inviteLink,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data as InviteCard
}

/**
 * 生成唯一的邀请码（调用数据库函数或生成）
 */
async function generateInviteCode(): Promise<string> {
  // 尝试调用数据库函数
  try {
    const { data, error } = await supabase.rpc('generate_invite_code')
    if (!error && data) return data
  } catch (err) {
    console.warn('Database function not available, generating client-side', err)
  }

  // 客户端生成（如果数据库函数不可用）
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 获取活动的所有邀请卡（主持人）
 */
export async function fetchEventInviteCards(eventId: string): Promise<InviteCard[]> {
  const { data, error } = await supabase
    .from('invite_cards')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as InviteCard[]
}

/**
 * 通过邀请码查找邀请卡
 */
export async function fetchInviteCardByCode(inviteCode: string): Promise<InviteCard | null> {
  const { data, error } = await supabase
    .from('invite_cards')
    .select('*')
    .eq('invite_code', inviteCode)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as InviteCard
}

/**
 * 获取用户通知
 */
export async function fetchUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as Notification[]
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)

  if (error) throw error
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
}

