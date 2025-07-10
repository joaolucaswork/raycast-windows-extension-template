export enum TimerState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export enum SessionType {
  WORK = 'work',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break'
}

export interface TimerSession {
  id: string
  type: SessionType
  duration: number // in seconds
  startTime: Date
  endTime?: Date
  completed: boolean
  taskName?: string
  projectName?: string
}

export interface TimerConfig {
  workDuration: number // in minutes
  shortBreakDuration: number // in minutes
  longBreakDuration: number // in minutes
  longBreakInterval: number // number of work sessions before long break
  enableNotifications: boolean
  autoStartBreaks: boolean
  autoStartWork: boolean
}

export interface TimerStats {
  totalSessions: number
  completedSessions: number
  totalWorkTime: number // in seconds
  totalBreakTime: number // in seconds
  streakCount: number
  todaysSessions: number
  weekSessions: number
  monthSessions: number
}

export interface PomodoroState {
  currentSession: TimerSession | null
  state: TimerState
  timeRemaining: number // in seconds
  sessionCount: number
  config: TimerConfig
  stats: TimerStats
  history: TimerSession[]
}

export interface TimerActions {
  startTimer: (type: SessionType, taskName?: string, projectName?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  skipSession: () => void
  updateConfig: (config: Partial<TimerConfig>) => void
  addTaskToSession: (taskName: string, projectName?: string) => void
  getNextSessionType: () => SessionType
}

export type PomodoroStore = PomodoroState & TimerActions
