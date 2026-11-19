-- Migration 031: Link click tracking (Phase 2)
--
-- Tracks clicks on outbound "our links" (footer socials etc.) via a
-- redirect-and-log endpoint: GET /api/v1/go/{slug} logs a click then 302s
-- to the destination. link_destinations holds the slug -> URL map (seeded
-- from the client Footer socials); link_clicks stores each click.
--
-- No RLS (backend connects as DB superuser); idempotent; gen_random_uuid ids.

CREATE TABLE IF NOT EXISTS link_destinations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    label       TEXT NOT NULL,
    destination TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS link_clicks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL,
    destination TEXT,
    referrer    TEXT,
    user_agent  TEXT,
    ip_address  TEXT,
    clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_slug       ON link_clicks (slug);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks (clicked_at);

-- Seed destinations from the client Footer SOCIALS.
INSERT INTO link_destinations (slug, label, destination) VALUES
  ('whatsapp',    'WhatsApp',    'https://wa.me/254707454182'),
  ('facebook',    'Facebook',    'https://www.facebook.com/share/1HLEwcEx22/'),
  ('instagram',   'Instagram',   'https://www.instagram.com/fixitbluetechnology58'),
  ('tiktok',      'TikTok',      'https://www.tiktok.com/@fixitbluetechnology58'),
  ('youtube',     'YouTube',     'https://www.youtube.com/@BlueTechnology58'),
  ('threads',     'Threads',     'https://www.threads.com/@fixitbluetechnology58'),
  ('google-maps', 'Google Maps', 'https://share.google/iKWWoeTxXsnOqGA9U')
ON CONFLICT (slug) DO NOTHING;
