import { supabase } from '@/lib/supabase'
import type { InviteCard, Notification, UserAvailability, AvailabilitySlot, FreeTimeWindow } from '@/types/database'

/**
 * 计算多个参与者的空闲时间窗口（重叠时间）
 */
export function calculateFreeTimeWindows(
  availabilities: UserAvailability[]
): FreeTimeWindow[] {
  if (availabilities.length === 0) return []

  // 收集所有时间槽
  const allSlots: Array<{ start: Date; end: Date; participantId: string }> = []
  
  availabilities.forEach(avail => {
    const participantId = avail.user_id || avail.guest_id || ''
    avail.available_slots.forEach(slot => {
      allSlots.push({
        start: new Date(slot.start),
        end: new Date(slot.end),
        participantId
      })
    })
  })

  if (allSlots.length === 0) return []

  // 找到所有时间的开始和结束范围
  const allStarts = allSlots.map(s => s.start.getTime())
  const allEnds = allSlots.map(s => s.end.getTime())
  const minStart = Math.min(...allStarts)
  const maxEnd = Math.max(...allEnds)

  // 按分钟切片检查重叠
  const windows: FreeTimeWindow[] = []
  const stepMinutes = 30 // 30分钟为粒度
  const stepMs = stepMinutes * 60 * 1000

  let currentStart = minStart
  while (currentStart < maxEnd) {
    const currentEnd = currentStart + stepMs
    const windowStart = new Date(currentStart)
    const windowEnd = new Date(currentEnd)

    // 检查这个时间窗口内有哪些参与者可用
    const availableParticipants = new Set<string>()
    
    availabilities.forEach(avail => {
      const participantId = avail.user_id || avail.guest_id || ''
      const isAvailable = avail.available_slots.some(slot => {
        const slotStart = new Date(slot.start)
        const slotEnd = new Date(slot.end)
        // 检查时间窗口是否与这个槽重叠
        return windowStart < slotEnd && windowEnd > slotStart
      })
      
      if (isAvailable) {
        availableParticipants.add(participantId)
      }
    })

    // 如果所有参与者都可用，记录这个窗口
    if (availableParticipants.size === availabilities.length && availableParticipants.size > 0) {
      // 尝试合并相邻的窗口
      const lastWindow = windows[windows.length - 1]
      if (lastWindow && 
          new Date(lastWindow.end).getTime() === currentStart &&
          lastWindow.participants.length === availableParticipants.size &&
          [...lastWindow.participants].every(p => availableParticipants.has(p))) {
        // 合并窗口
        lastWindow.end = windowEnd.toISOString()
      } else {
        // 创建新窗口
        windows.push({
          start: windowStart.toISOString(),
          end: windowEnd.toISOString(),
          participants: Array.from(availableParticipants),
          participant_count: availableParticipants.size
        })
      }
    }

    currentStart = currentEnd
  }

  return windows
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

