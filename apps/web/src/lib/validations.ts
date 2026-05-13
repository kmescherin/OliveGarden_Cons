import { z } from "zod";

export const profileDataSchema = z.object({
  full_name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().default(""),
  block: z.string().min(1).max(10),
  apartment: z.string().min(1).max(10),
});

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
}).merge(profileDataSchema);

export const moderateProfileSchema = z.object({
  targetUserId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional().default(""),
});

export const serviceRequestSchema = z.object({
  service_type_id: z.string().uuid(),
  description: z.string().min(1).max(2000),
  preferred_at: z.string().optional().nullable(),
});

export const updateServiceStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["new", "in_progress", "done", "cancelled"]),
});

export const suggestionSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().default(""),
});

export const updateSuggestionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "accepted", "rejected"]),
  boardNote: z.string().max(1000).optional().default(""),
});

export const contentPageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(500),
  body: z.string().max(50000),
  visibility: z.enum(["public", "residents"]),
});

export const socialZoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  schedule: z.string().max(200).optional().default(""),
  sort_order: z.number().int().min(0),
});

export const announcementSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  body: z.string().max(50000).optional().default(""),
  visibility: z.enum(["public", "residents"]),
});

export const deleteByIdSchema = z.object({
  id: z.string().uuid(),
});

export const boardMemberSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(200),
  role_title: z.string().max(200).optional().default(""),
  phone: z.string().max(50).optional().default(""),
  email: z.string().max(320).optional().default(""),
  sort_order: z.number().int().min(0),
});

export const grantRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["board", "admin"]),
});

export const grantRoleByEmailSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["board", "admin"]),
});

export const ragChatSchema = z.object({
  question: z.string().min(1).max(2000),
});

export const testerFeedbackSchema = z.object({
  category: z.enum(["bug", "feature", "question", "other"]),
  severity: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  page_url: z.string().max(1000).optional().default(""),
  user_agent: z.string().max(500).optional().default(""),
});

export const updateTesterFeedbackStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved", "wontfix"]),
  adminNote: z.string().max(2000).optional().default(""),
});
