-- Read-only: run in the Supabase SQL editor AFTER applying 003.
-- Every private table must have RLS, and all browser privileges must be false.
SELECT c.relname, c.relrowsecurity,
  has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
  has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS browser_access
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('users','auth_tokens','sessions','cvs','cv_versions','share_links','cv_views','job_descriptions','uploaded_files','rate_limits','templates');

SELECT p.oid::regprocedure AS function, p.prosecdef AS security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS browser_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('consume_magic_token','create_cv_atomic','save_cv_draft','snapshot_cv','restore_cv','publish_cv','take_rate_limit','save_photo','clean_expired_tokens');

SELECT count(*) AS inconsistent_cvs FROM public.cvs c LEFT JOIN public.cv_versions v ON v.id=c.current_version_id
WHERE c.draft_data IS NULL OR (c.current_version_id IS NOT NULL AND (v.id IS NULL OR v.cv_id<>c.id));
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid='public.cv_versions'::regclass AND tgname='immutable_cv_versions';
-- Also verify policies, role memberships, custom RPCs and any other exposed schemas.
SELECT schemaname,tablename,policyname,roles,cmd FROM pg_policies WHERE schemaname='public';
