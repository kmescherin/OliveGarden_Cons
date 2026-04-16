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
