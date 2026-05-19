export type HabitStatus = 'done' | 'tiny_done' | 'recovered' | 'missed' | 'rest_day' | 'skipped'
export type ScheduleType = 'daily' | 'weekdays' | 'weekends' | 'custom'
export type HabitActiveStatus = 'active' | 'paused' | 'archived'

export interface Habit {
  habit_id: string
  user_id: string
  name: string
  category: string | null
  schedule_type: ScheduleType
  schedule_days: number[]
  reminder_enabled: boolean
  reminder_time: string | null
  tiny_version: string
  status: HabitActiveStatus
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface HabitLog {
  log_id: string
  habit_id: string
  user_id: string
  date: string
  status: HabitStatus
  completed_at: string | null
  is_retroactive_edit: boolean
  source: 'app' | 'notification' | 'manual_edit'
  notes: string | null
  created_at: string
  updated_at: string
}
