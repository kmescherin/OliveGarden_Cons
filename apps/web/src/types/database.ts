export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AppRole = "resident" | "board" | "admin";
export type ServiceRequestStatus =
  | "new"
  | "in_progress"
  | "done"
  | "cancelled";
export type ContentVisibility = "public" | "residents";

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  block: string | null;
  apartment: string | null;
  approval_status: ApprovalStatus;
  approval_note: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceType = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type ServiceRequest = {
  id: string;
  user_id: string;
  service_type_id: string | null;
  description: string;
  preferred_at: string | null;
  status: ServiceRequestStatus;
  photo_paths: string[] | null;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  visibility: ContentVisibility;
  published_at: string;
};

export type BoardMember = {
  id: string;
  full_name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
};

export type Suggestion = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  status: string;
  board_note: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationType =
  | "announcement_new"
  | "request_status_changed"
  | "suggestion_status_changed"
  | "meeting_scheduled"
  | "decision_published"
  | "guest_pass_status_changed";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type MeetingStatus = "scheduled" | "completed" | "cancelled";
export type MeetingType = "regular" | "extraordinary" | "annual";

export type Meeting = {
  id: string;
  title: string;
  description: string | null;
  meeting_type: MeetingType;
  scheduled_at: string;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Decision = {
  id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  decided_at: string;
  created_at: string;
};

export type ElectionCandidate = {
  id: string;
  full_name: string;
  program: string | null;
  photo_path: string | null;
  election_year: number;
  sort_order: number;
  created_at: string;
};

export type Vehicle = {
  id: string;
  user_id: string;
  plate_number: string;
  vehicle_description: string | null;
  is_temporary: boolean;
  valid_from: string | null;
  valid_until: string | null;
  status: "active" | "expired" | "removed";
  created_at: string;
};

export type GuestPass = {
  id: string;
  user_id: string;
  guest_name: string;
  pass_type: "car" | "pedestrian";
  plate_number: string | null;
  valid_from: string;
  valid_until: string;
  status: "pending" | "active" | "used" | "cancelled";
  notes: string | null;
  created_at: string;
};

export type KeyFob = {
  id: string;
  user_id: string;
  key_type: "entrance" | "parking" | "storage" | "mail" | "other";
  identifier: string;
  issued_at: string;
  status: "issued" | "returned" | "lost";
  notes: string | null;
  created_at: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

export type TesterFeedbackCategory = "bug" | "feature" | "question" | "other";
export type TesterFeedbackSeverity = "low" | "normal" | "high" | "critical";
export type TesterFeedbackStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "wontfix";

export type TesterFeedback = {
  id: string;
  user_id: string;
  category: TesterFeedbackCategory;
  severity: TesterFeedbackSeverity;
  title: string;
  description: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: TesterFeedbackStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};
