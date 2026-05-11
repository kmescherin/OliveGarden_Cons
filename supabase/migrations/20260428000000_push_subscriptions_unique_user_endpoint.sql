-- Add unique constraint on (user_id, endpoint) so subscribe upsert
-- has a real conflict target and cannot be used to hijack another
-- user's endpoint by upserting on `endpoint` alone.
alter table public.push_subscriptions
  add constraint push_subscriptions_user_endpoint_unique
  unique (user_id, endpoint);
