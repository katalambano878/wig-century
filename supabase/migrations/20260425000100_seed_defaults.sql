-- Seed baseline rows used by the app (Wig Century).
-- Safe to re-run: uses ON CONFLICT DO NOTHING.

INSERT INTO public.site_settings (key, value, category) VALUES
  ('store_pricing', '{"sales_active": false}'::jsonb, 'pricing'),
  ('site_identity', '{"site_name":"Wig Century","site_tagline":"Premium Wigs · Bundles · Hair Care","site_logo":"/logo.png"}'::jsonb, 'general'),
  ('contact_info', '{"email":"","phone":"","address":""}'::jsonb, 'contact'),
  ('social_links', '{"facebook":"","instagram":"","twitter":"","tiktok":"","snapchat":"","youtube":""}'::jsonb, 'social'),
  ('branding_colors', '{"primary_color":"#2563EB","secondary_color":"#EFF6FF"}'::jsonb, 'branding')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.store_modules (id, enabled) VALUES
  ('notifications', true),
  ('cms', true),
  ('homepage', true),
  ('blog', true),
  ('customer-insights', false),
  ('flash-sales', false),
  ('loyalty-program', false),
  ('pwa-settings', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cms_content (section, block_key, title, subtitle, content, is_active) VALUES
  ('contact','main','Contact Wig Century','We''re here to help','Have a question about our wigs, bundles or hair care? Send us a message and our team will get back to you as soon as possible.', true),
  ('home','hero','Premium Wigs, Delivered','Lace fronts, bundles, and pro-grade care','Discover handpicked wigs and hair care products curated for lasting quality and a flawless look.', true),
  ('about','mission','Our Mission','Elevate everyday hair','Wig Century makes premium hair accessible. From lace-front wigs to bundles and care essentials, every product is picked with confidence in mind.', true)
ON CONFLICT (section, block_key) DO NOTHING;

INSERT INTO public.pages (title, slug, content, status, seo_title, seo_description) VALUES
  ('Terms of Service','terms','<h1>Terms of Service</h1><p>Welcome to Wig Century.</p>','published','Terms of Service | Wig Century','Terms and conditions for using Wig Century.'),
  ('Privacy Policy','privacy','<h1>Privacy Policy</h1><p>Your privacy matters at Wig Century.</p>','published','Privacy Policy | Wig Century','How Wig Century handles your information.'),
  ('Shipping & Returns','shipping-returns','<h1>Shipping &amp; Returns</h1><p>Shipping and return policies.</p>','published','Shipping & Returns | Wig Century','Shipping and return policies for Wig Century.')
ON CONFLICT (slug) DO NOTHING;
