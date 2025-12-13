export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface GuestIdentity {
  id: string
  display_name: string
  last_active_at?: string
  created_at?: string
}

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  phone_number: string | null
  social_links: Json
  created_at: string
}

export type EventStatus = 'draft' | 'polling' | 'scheduled' | 'cancelled' | 'past'

export interface TacitEvent {
  id: string
  creator_id: string | null
  org_id: string | null
  status: EventStatus
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  timezone: string
  poll_deadline: string | null // 调研截止时间
  location_name: string | null
  location_address: string | null
  location_url: string | null
  cover_image_url: string | null
  theme_config: {
    preset?: string
    font?: string
    effect?: string
    primary_color?: string
    bg_color?: string
    effects?: string[]
  }
  modules_config: {
    spotify?: { url: string } | null
    gift_registry?: { items: string[] } | null
    dress_code?: { text: string } | null
    chip_in?: { amount: number; currency: string } | null
    secret_address?: string | null
  }
  max_capacity: number | null
  show_guest_list: boolean
  approval_required?: boolean
  created_at: string
}

export interface EventTimePoll {
  id: string
  event_id: string
  start_time: string
  end_time: string | null
}

export type PollVoteStatus = 'yes' | 'if_need_be' | 'no'

export interface EventPollVote {
  id: string
  poll_id: string
  user_id: string | null
  guest_id: string | null
  status: PollVoteStatus
  created_at: string
}

export type RSVPStatus = 'going' | 'maybe' | 'not_going' | 'waitlist'

export interface RSVP {
  id: string
  event_id: string
  user_id: string | null
  guest_id: string | null
  status: RSVPStatus
  guests_count: number
  comment: string | null
  phone_number: string | null
  created_at: string
}

export type ActivityType = 'blast' | 'comment' | 'photo' | 'rsvp_log'

export interface Activity {
  id: string
  event_id: string
  user_id: string | null
  guest_id: string | null
  type: ActivityType
  content: string | null
  media_url: string | null
  created_at: string
}

export interface Organization {
  id: string
  handle: string
  name: string
  description: string | null
  logo_url: string | null
  social_links: Json
  created_at: string
}

export type OrgRole = 'owner' | 'admin' | 'member'

export interface OrgMember {
  org_id: string
  user_id: string
  role: OrgRole
}

// 邀请卡
export interface InviteCard {
  id: string
  event_id: string
  user_id: string | null
  guest_id: string | null
  invite_code: string
  invite_link: string
  status: 'pending' | 'sent' | 'opened' | 'responded'
  generated_at: string
  sent_at: string | null
  opened_at: string | null
  responded_at: string | null
  created_at: string
}

// 通知
export type NotificationType = 'poll_deadline_reminder' | 'invite_card_ready' | 'poll_result' | 'event_reminder'

export interface Notification {
  id: string
  user_id: string
  event_id: string | null
  invite_card_id: string | null
  type: NotificationType
  title: string
  message: string | null
  link: string | null
  read: boolean
  read_at: string | null
  created_at: string
}

// 用户可用时间
export interface AvailabilitySlot {
  start: string
  end: string
}

export interface UserAvailability {
  id: string
  event_id: string
  user_id: string | null
  guest_id: string | null
  available_slots: AvailabilitySlot[]
  updated_at: string
  created_at: string
}

// 空闲时间窗口（计算后的重叠时间）
export interface FreeTimeWindow {
  start: string
  end: string
  participants: string[] // user_id 或 guest_id 数组
  participant_count: number
}

