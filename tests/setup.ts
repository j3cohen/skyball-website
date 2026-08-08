// tests/setup.ts
// Runs before every test file. Points ALL Supabase clients at the
// LOCAL stack (or harmless dummies) so importing server modules never
// constructs a client aimed at production. The keys below are the
// supabase CLI's public local-development demo keys — not secrets.

export const LOCAL_API_URL = "http://127.0.0.1:54341";
export const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const LOCAL_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_URL = LOCAL_API_URL;
process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_ANON_KEY = LOCAL_ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = LOCAL_SERVICE_KEY;

// Mobile project: dummy local values — tests must never reach prod
// mobile. Modules that would talk to it get mocked in the tests.
process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL = LOCAL_API_URL;
process.env.MOBILE_SUPABASE_SERVICE_ROLE_KEY = LOCAL_SERVICE_KEY;
process.env.NEXT_PUBLIC_MOBILE_SUPABASE_ANON_KEY = LOCAL_ANON_KEY;

// Neutralize outbound integrations.
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_never_used";
