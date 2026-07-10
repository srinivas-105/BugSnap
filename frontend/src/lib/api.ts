import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const isPlatform = config.url?.startsWith('/platform')
  const token = isPlatform ? localStorage.getItem('platform_token') : localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any
  const detail = anyErr?.response?.data?.error
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg || JSON.stringify(d)).join(', ')
  }
  if (anyErr?.message) return anyErr.message
  return 'Something went wrong. Please try again.'
}

export type Role = 'admin' | 'developer' | 'tester'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type BugStatus = 'open' | 'in_progress' | 'ready_for_testing' | 'resolved' | 'closed'

export interface OrganizationOut {
  id: string
  name: string
  workspace_code: string
  org_type: string
  created_at: string
}

export interface OrganizationWithStats extends OrganizationOut {
  user_count: number
  project_count: number
  bug_count: number
}

export interface UserOut {
  id: string
  name: string
  email: string
  role: Role
  organization_id: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface AuthResponseData {
  access_token: string
  user: UserOut
  organization: OrganizationOut
  is_first_login: boolean
}

export interface BugCounts {
  open: number
  in_progress: number
  ready_for_testing: number
  resolved: number
  closed: number
}

export interface ProjectOut {
  id: string
  name: string
  url: string | null
  description: string | null
  created_at: string
  bug_counts: BugCounts
}

export interface CommentOut {
  id: string
  body: string
  created_at: string
  user_id: string
  user_name: string
}

export interface BugOut {
  id: string
  project_id: string
  project_name: string
  reported_by_user_id: string
  reporter_name: string
  title: string
  description: string | null
  steps_to_reproduce: string | null
  priority: Priority
  status: BugStatus
  browser: string | null
  operating_system: string | null
  device: string | null
  screen_resolution: string | null
  screenshot_url: string | null
  created_at: string
  updated_at: string
  comments: CommentOut[]
}

export interface AiExtracted {
  title: string | null
  description: string | null
  steps_to_reproduce: string | null
  priority: Priority | null
  project_id: string | null
  project_name_guess: string | null
}

export interface AiAssistResponse {
  message: string
  done: boolean
  extracted: AiExtracted
  ai_powered: boolean
}
