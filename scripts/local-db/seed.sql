-- scripts/local-db/seed.sql
-- Synthetic seed data for the LOCAL Supabase stack only. No real
-- customer PII — names/emails are fake. Product catalog rows live in
-- seed-catalog.sql (copied from prod's public catalog).

-- ── Synthetic orders (one per fulfillment status the app uses) ────
INSERT INTO orders (id, stripe_session_id, customer_email, customer_name, shipping_address,
                    order_data, order_total_cents, order_summary, fulfillment_status, created_at)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'cs_test_seed_pending', 'buyer1@example.test', 'Pat Pending',
   '{"line1":"1 Test St","city":"Brooklyn","state":"NY","postal_code":"11201","country":"US"}',
   '{"version":1,"items":[{"product_name":"SkyBall Racket","quantity":1,"customizations":{}}],"customer_selections":{}}',
   4900, '1× SkyBall Racket', 'pending', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', 'cs_test_seed_processing', 'buyer2@example.test', 'Chris Crossing',
   '{"line1":"2 Test Ave","city":"Austin","state":"TX","postal_code":"78701","country":"US"}',
   '{"version":1,"items":[{"product_name":"Essentials Kit","quantity":1,"customizations":{"ball_color":"orange"}}],"customer_selections":{}}',
   9900, '1× Essentials Kit', 'processing', now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000003', 'cs_test_seed_fulfilled', 'buyer3@example.test', 'Sam Shipped',
   '{"line1":"3 Test Blvd","city":"Denver","state":"CO","postal_code":"80202","country":"US"}',
   '{"version":1,"items":[{"product_name":"Anywhere Kit","quantity":2,"customizations":{}}],"customer_selections":{}}',
   19800, '2× Anywhere Kit', 'fulfilled', now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000004', 'cs_test_seed_cancelled', 'buyer4@example.test', 'Casey Cancelled',
   NULL,
   '{"version":1,"items":[{"product_name":"Grip 3-Pack","quantity":1,"customizations":{"grip_colors":["blue","white","pink"]}}],"customer_selections":{}}',
   1500, '1× Grip 3-Pack', 'cancelled', now() - interval '9 days'),
  ('00000000-0000-4000-8000-000000000005', 'cs_test_seed_event', 'player1@example.test', 'Erin Entry',
   NULL,
   '{"version":1,"items":[{"product_name":"Tournament entry","quantity":1,"customizations":{}}],"customer_selections":{}}',
   2500, 'Tournament entry: Local Test Open ($25)', 'event', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000006', 'cs_test_seed_needs_match', 'buyer5@example.test', 'Morgan Mystery',
   NULL,
   '{"version":1,"items":[],"customer_selections":{}}',
   3000, 'Imported from Stripe', 'needs-match', now() - interval '3 days')
ON CONFLICT (stripe_session_id) DO NOTHING;

-- ── Fixture certification program (mirrors lib/certification/fixtures.ts) ──
INSERT INTO cert_programs (id, slug, title, description, pass_threshold_type, pass_threshold_value,
                           retake_cooldown_minutes, expiry_months, status)
VALUES ('10000000-0000-4000-8000-000000000001', 'coaching-level-1',
        'SkyBall Coaching Certification — Level 1',
        'Learn the fundamentals of coaching SkyBall: rules and safety, core technique, and how to run engaging sessions.',
        'percent', 66, 5, 24, 'published')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cert_offers (id, program_id, name, description, price_cents, seat_count, equipment_items, position)
VALUES
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001',
   'Certification — Single', 'One certification seat.', 9900, 1, '[]', 0),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001',
   'Club 3-Pack', 'Three certification seats for your coaching staff.', 24900, 3, '[]', 1),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001',
   'Club Starter Combo', 'Everything a club needs to launch a SkyBall program.', 79900, 3,
   '[{"label":"SkyBall Racket","qty":8},{"label":"SkyBall Official Ball","qty":12}]', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cert_sections (id, program_id, position, title, intro_enabled, intro_title, intro_body, video_url)
VALUES
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 0,
   'Rules, Court & Safety', TRUE, 'Welcome to SkyBall Coaching',
   'Official rules, court dimensions, and the safety fundamentals every coach is responsible for.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001', 1,
   'Core Technique & Progressions', FALSE, NULL, NULL,
   'https://youtu.be/dQw4w9WgXcQ'),
  ('10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001', 2,
   'Running Great Sessions', TRUE, 'Coaching Groups',
   'Session structure: warm-ups, rotations, and group management.',
   'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cert_questions (id, section_id, position, prompt, choices, correct_index, explanation)
VALUES
  ('10000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000021', 0,
   'What are the dimensions of a SkyBall court?',
   '["30'' x 60''","20'' x 44''","18'' x 36''","27'' x 78''"]', 1,
   'Same footprint as a pickleball court.'),
  ('10000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000021', 1,
   'How does a rally begin?',
   '["Overhand serve","Drop hit","Underhand serve from behind the baseline","Net toss"]', 2, NULL),
  ('10000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000021', 2,
   'What is the coach''s first responsibility at the start of every session?',
   '["Check the court for hazards","Collect payment","Start a scrimmage","Assign captains"]', 0, NULL),
  ('10000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000022', 0,
   'Where should players make contact for maximum control?',
   '["Behind the body","Overhead","At the hip","Out in front of the body"]', 3,
   'Front contact maximizes control on the light ball.'),
  ('10000000-0000-4000-8000-000000000035', '10000000-0000-4000-8000-000000000022', 1,
   'Which grip should beginners start with?',
   '["Western","Continental","Two-handed","Any grip"]', 1, NULL),
  ('10000000-0000-4000-8000-000000000036', '10000000-0000-4000-8000-000000000023', 0,
   'Ideal group size per court for drills?',
   '["2","8","4","12"]', 2, 'Groups of 4 keeps everyone hitting.')
ON CONFLICT (id) DO NOTHING;
