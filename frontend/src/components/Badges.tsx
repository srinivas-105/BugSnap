import { BugStatus, Priority, Role } from '../lib/api'

const STATUS_LABELS: Record<BugStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  ready_for_testing: 'Ready for Testing',
  resolved: 'Resolved',
  closed: 'Closed',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  developer: 'Developer',
  tester: 'Tester',
}

export function StatusBadge({ status }: { status: BugStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge badge-${priority}`}>
      <span className="badge-dot" />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`badge badge-role-${role}`}>{ROLE_LABELS[role]}</span>
}
