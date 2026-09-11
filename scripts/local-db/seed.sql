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

-- ── Fixture certification program ─────────────────────────────────
-- Mirrors the LIVE skyball.us/coaching program shape (fetched 2026-09-10):
-- title, description, 8 sections in order (7 video + a standalone final
-- Exam quiz), and the 4 offers. Same shape as the new backend's fixture
-- (skyball-backend/scripts/seed-fixtures.ts) so the content ETL
-- (npm run cert:export-website) can be rehearsed end-to-end locally.
-- PLACEHOLDER videos/questions: the real ones live only in the hosted
-- website DB.
INSERT INTO cert_programs (id, slug, title, description, pass_threshold_type, pass_threshold_value,
                           retake_cooldown_minutes, expiry_months, status)
VALUES ('10000000-0000-4000-8000-000000000001', 'coaching-level-1',
        'SkyBall Coaching Certification',
        'Become a certified SkyBall coach with our self-paced video course. Watch, learn, pass the final exam, and earn your official certificate.',
        'percent', 80, 0, 24, 'published')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO cert_offers (id, program_id, name, description, price_cents, seat_count, equipment_items, position)
VALUES
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001',
   'Coaching Certification',
   'One Level 1 SkyBall Coaching Certification. Good for 24 months after completion.',
   9900, 1, '[]', 0),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001',
   'Intro Package', 'Certification valid for 24 months after completion.', 20000, 1,
   '[{"label":"SkyBall Pro Racket","qty":4},{"label":"SkyBall","qty":8}]', 1),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001',
   'Standard Package', 'Certification valid for 24 months after completion.', 30000, 1,
   '[{"label":"Eclipse Racket","qty":2},{"label":"Pro Racket","qty":6},{"label":"SkyBall","qty":12}]', 2),
  ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001',
   'Pro Package', 'Certification valid for 24 months after completion.', 50000, 2,
   '[{"label":"Eclipse Racket","qty":4},{"label":"Pro Racket","qty":4},{"label":"SkyBall","qty":20}]', 3)
ON CONFLICT (id) DO NOTHING;

-- Sections 1–7: video only (no quiz → auto-pass). Section 8 "Exam": quiz only.
-- PLACEHOLDER video id ("PLACEHOLDER" is a valid 11-char id shape).
INSERT INTO cert_sections (id, program_id, position, title, intro_enabled, intro_title, intro_body, video_url)
VALUES
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000001', 0,
   'Rules', TRUE, 'Welcome to SkyBall Coaching',
   'Work through the seven video sections at your own pace, then pass the final exam to earn your Level 1 certificate.',
   'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000001', 1,
   'Grips', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000001', 2,
   'Serve', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000001', 3,
   'Groundstrokes', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000001', 4,
   'Net Play', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000001', 5,
   'Singles and Doubles Strategy', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000027', '10000000-0000-4000-8000-000000000001', 6,
   'Running a Session', FALSE, NULL, NULL, 'https://www.youtube.com/watch?v=PLACEHOLDER'),
  ('10000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000001', 7,
   'Exam', FALSE, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Final exam: 8 placeholder multiple-choice questions (all on the Exam section).
INSERT INTO cert_questions (id, section_id, position, prompt, choices, correct_index, explanation)
VALUES
  ('10000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000028', 0,
   'What are the dimensions of a SkyBall court?',
   '["30'' x 60''","20'' x 44''","18'' x 36''","27'' x 78''"]', 1,
   'SkyBall is played on a 20'' x 44'' court — the same footprint as a pickleball court.'),
  ('10000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000028', 1,
   'How must the serve be struck?',
   '["Overhand, like a tennis serve","Underhand, with contact below the waist","Off a bounce from mid-court","Any way the server chooses"]', 1,
   'Every point starts with an underhand serve from behind the baseline, contact below the waist.'),
  ('10000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000028', 2,
   'Where must the serve land?',
   '["Anywhere on the opponent''s side","In the service box directly across the net","In the diagonally opposite service box","Inside the kitchen"]', 2,
   'Serves go cross-court into the diagonally opposite service box; a serve that lands in the kitchen is a fault.'),
  ('10000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000028', 3,
   'Games are played to how many points?',
   '["7, win by 1","11, win by 2","15, win by 1","21, win by 2"]', 1,
   'Games go to 11 and must be won by 2 points.'),
  ('10000000-0000-4000-8000-000000000035', '10000000-0000-4000-8000-000000000028', 4,
   'The non-volley zone ("kitchen") extends how far from the net?',
   '["3 feet","5 feet","7 feet","10 feet"]', 2,
   'The kitchen is the 7-foot zone on each side of the net; players may not volley while standing in it.'),
  ('10000000-0000-4000-8000-000000000036', '10000000-0000-4000-8000-000000000028', 5,
   'A player standing inside the kitchen may:',
   '["Volley the ball out of the air","Only play the ball after it bounces","Serve from there","Do anything — the kitchen is just a marking"]', 1,
   'Volleys are not allowed from inside the kitchen. Let the ball bounce first, then play it.'),
  ('10000000-0000-4000-8000-000000000037', '10000000-0000-4000-8000-000000000028', 6,
   'What is the coach''s first responsibility at the start of every session?',
   '["Check the court and surroundings for hazards","Collect payment","Start a scrimmage immediately","Assign team captains"]', 0,
   'Safety first: walk the court, clear stray balls and debris, and check the net and surroundings before play.'),
  ('10000000-0000-4000-8000-000000000038', '10000000-0000-4000-8000-000000000028', 7,
   'What is the ideal group size per court for skill drills?',
   '["2","4","8","12"]', 1,
   'Groups of 4 keep everyone hitting and rotating; larger groups mean players stand and wait.')
ON CONFLICT (id) DO NOTHING;
