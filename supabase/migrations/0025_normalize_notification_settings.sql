-- Keep the mobile preference names and the legacy push worker names in sync.
-- Existing explicit opt-outs remain disabled; missing values default to enabled.
alter table public.users
  alter column notification_settings set default
  '{"push": true, "pushEnabled": true, "email": true, "emailEnabled": true, "sms": false, "promoEnabled": false, "securityEnabled": true}'::jsonb;

update public.users
set notification_settings = coalesce(notification_settings, '{}'::jsonb) || jsonb_build_object(
  'push', coalesce(
    (notification_settings ->> 'pushEnabled')::boolean,
    (notification_settings ->> 'push')::boolean,
    true
  ),
  'pushEnabled', coalesce(
    (notification_settings ->> 'pushEnabled')::boolean,
    (notification_settings ->> 'push')::boolean,
    true
  ),
  'email', coalesce(
    (notification_settings ->> 'emailEnabled')::boolean,
    (notification_settings ->> 'email')::boolean,
    true
  ),
  'emailEnabled', coalesce(
    (notification_settings ->> 'emailEnabled')::boolean,
    (notification_settings ->> 'email')::boolean,
    true
  ),
  'promoEnabled', coalesce((notification_settings ->> 'promoEnabled')::boolean, false),
  'securityEnabled', coalesce((notification_settings ->> 'securityEnabled')::boolean, true)
);
