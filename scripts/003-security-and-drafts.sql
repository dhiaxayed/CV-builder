-- Custom sessions are validated by the server. Browser roles have NO access.
-- Apply after 001 and 002, with a backup and a coordinated application rollout.
BEGIN;

ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS draft_data jsonb;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS published_data jsonb;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS published_title text;
ALTER TABLE public.cvs ADD COLUMN IF NOT EXISTS published_template_id text;
ALTER TABLE public.cv_versions ADD COLUMN IF NOT EXISTS template_id text;

-- Copy the latest working state once. Existing historical rows are preserved.
UPDATE public.cvs c SET draft_data = CASE
  WHEN c.photo_url IS NOT NULL AND coalesce(v.data#>>'{basics,photoUrl}', '') = ''
    THEN jsonb_set(v.data, '{basics,photoUrl}', to_jsonb(c.photo_url), true)
  ELSE v.data END
FROM public.cv_versions v WHERE v.id = c.current_version_id AND c.draft_data IS NULL;
UPDATE public.cvs SET draft_data = '{"basics":{"name":"","title":"","contact":{"email":"","phone":"","location":""}},"summary":"","experience":[],"education":[],"projects":[],"skills":[],"certifications":[],"awards":[],"languages":[],"customSections":[]}'::jsonb WHERE draft_data IS NULL;
ALTER TABLE public.cvs ALTER COLUMN draft_data SET NOT NULL;
UPDATE public.cv_versions v SET template_id = c.template_id FROM public.cvs c WHERE c.id = v.cv_id AND v.template_id IS NULL;
UPDATE public.cvs SET published_data = draft_data, published_title = title, published_template_id = template_id WHERE is_public AND published_data IS NULL;

-- Protect credentials at rest while keeping existing active links/sessions valid.
UPDATE public.auth_tokens SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex') WHERE token !~ '^[a-f0-9]{64}$';
UPDATE public.sessions SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex') WHERE token !~ '^[a-f0-9]{64}$';

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','auth_tokens','sessions','cvs','cv_versions','share_links','cv_views','job_descriptions','uploaded_files','rate_limits'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.templates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.templates TO service_role;

-- A conditional UPDATE acquires a row lock and rechecks predicates after waiting.
-- Only one concurrent consumer can receive an email from RETURNING.
CREATE OR REPLACE FUNCTION public.consume_magic_token(p_token text)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = public, pg_temp AS $$
  UPDATE public.auth_tokens SET used_at = now()
  WHERE token = p_token AND used_at IS NULL AND expires_at > now() AND type = 'magic_link'
  RETURNING email;
$$;

CREATE OR REPLACE FUNCTION public.create_cv_atomic(p_user_id text, p_title text, p_template_id text, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE owner_row public.users; cv_row public.cvs; version_row public.cv_versions;
BEGIN
  -- Lock the owner, not the count: even simultaneous first creations serialize.
  SELECT * INTO owner_row FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  IF owner_row.plan_tier <> 'pro' AND coalesce(owner_row.preferences->>'tier', '') <> 'pro'
     AND EXISTS (SELECT 1 FROM public.cvs WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'FREE_TIER_CV_LIMIT';
  END IF;
  INSERT INTO public.cvs(user_id,title,template_id,draft_data) VALUES(p_user_id,p_title,p_template_id,p_data) RETURNING * INTO cv_row;
  INSERT INTO public.cv_versions(cv_id,version,data,note,created_by,template_id)
    VALUES(cv_row.id,1,p_data,'Initial version',p_user_id,p_template_id) RETURNING * INTO version_row;
  UPDATE public.cvs SET current_version_id = version_row.id WHERE id = cv_row.id RETURNING * INTO cv_row;
  RETURN to_jsonb(cv_row) || jsonb_build_object('current_version',to_jsonb(version_row));
END $$;

CREATE OR REPLACE FUNCTION public.save_cv_draft(p_cv_id text, p_user_id text, p_expected_revision bigint, p_data jsonb DEFAULT NULL, p_title text DEFAULT NULL, p_template_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE cv_row public.cvs;
BEGIN
  SELECT * INTO cv_row FROM public.cvs WHERE id = p_cv_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  IF cv_row.revision <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  UPDATE public.cvs SET draft_data = coalesce(p_data,draft_data), title = coalesce(p_title,title),
    template_id = coalesce(p_template_id,template_id), revision = revision + 1,
    photo_url = CASE WHEN p_data IS NULL THEN photo_url ELSE p_data#>>'{basics,photoUrl}' END,
    ats_score = NULL
    WHERE id = p_cv_id AND user_id = p_user_id RETURNING * INTO cv_row;
  RETURN to_jsonb(cv_row);
END $$;

CREATE OR REPLACE FUNCTION public.snapshot_cv(p_cv_id text, p_user_id text, p_expected_revision bigint, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE cv_row public.cvs; version_row public.cv_versions; next_version integer;
BEGIN
  SELECT * INTO cv_row FROM public.cvs WHERE id = p_cv_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  IF cv_row.revision <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  SELECT coalesce(max(version),0) + 1 INTO next_version FROM public.cv_versions WHERE cv_id = p_cv_id;
  INSERT INTO public.cv_versions(cv_id,version,data,note,created_by,template_id)
    VALUES(p_cv_id,next_version,cv_row.draft_data,p_note,p_user_id,cv_row.template_id) RETURNING * INTO version_row;
  -- Updating the revision makes snapshot/restore and other tabs observable.
  UPDATE public.cvs SET current_version_id = version_row.id, revision = revision + 1 WHERE id = p_cv_id RETURNING * INTO cv_row;
  RETURN jsonb_build_object('version',to_jsonb(version_row),'revision',cv_row.revision);
END $$;

CREATE OR REPLACE FUNCTION public.restore_cv(p_cv_id text, p_user_id text, p_version_id text, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE cv_row public.cvs; version_row public.cv_versions;
BEGIN
  SELECT * INTO cv_row FROM public.cvs WHERE id = p_cv_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  IF cv_row.revision <> p_expected_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  SELECT * INTO version_row FROM public.cv_versions WHERE id = p_version_id AND cv_id = p_cv_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'VERSION_NOT_FOUND'; END IF;
  UPDATE public.cvs SET draft_data = version_row.data, template_id = coalesce(version_row.template_id,template_id),
    photo_url = version_row.data#>>'{basics,photoUrl}', current_version_id = version_row.id,
    revision = revision + 1, ats_score = NULL WHERE id = p_cv_id RETURNING * INTO cv_row;
  RETURN to_jsonb(cv_row);
END $$;

CREATE OR REPLACE FUNCTION public.prevent_snapshot_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  -- FK ON DELETE SET NULL may remove the author; content is always immutable.
  IF (to_jsonb(NEW) - 'created_by') IS DISTINCT FROM (to_jsonb(OLD) - 'created_by') THEN
    RAISE EXCEPTION 'IMMUTABLE_CV_VERSION';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS immutable_cv_versions ON public.cv_versions;
CREATE TRIGGER immutable_cv_versions BEFORE UPDATE ON public.cv_versions FOR EACH ROW EXECUTE FUNCTION public.prevent_snapshot_update();

CREATE OR REPLACE FUNCTION public.publish_cv(p_cv_id text, p_user_id text, p_is_public boolean, p_token text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE cv_row public.cvs;
BEGIN
  SELECT * INTO cv_row FROM public.cvs WHERE id = p_cv_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CV_NOT_FOUND'; END IF;
  IF p_is_public AND cv_row.is_public AND cv_row.share_token IS NOT NULL THEN RETURN cv_row.share_token; END IF;
  UPDATE public.cvs SET is_public = p_is_public,
    share_token = CASE WHEN p_is_public THEN p_token ELSE NULL END,
    published_data = CASE WHEN p_is_public THEN draft_data ELSE NULL END,
    published_title = CASE WHEN p_is_public THEN title ELSE NULL END,
    published_template_id = CASE WHEN p_is_public THEN template_id ELSE NULL END
  WHERE id = p_cv_id;
  RETURN CASE WHEN p_is_public THEN p_token ELSE NULL END;
END $$;

CREATE OR REPLACE FUNCTION public.take_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN RETURN false; END IF;
  INSERT INTO public.rate_limits(key,window_start,attempts) VALUES(p_key,now(),1)
  ON CONFLICT(key) DO UPDATE SET
    attempts = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => p_window_seconds) THEN 1 ELSE rate_limits.attempts + 1 END,
    window_start = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => p_window_seconds) THEN now() ELSE rate_limits.window_start END
  RETURNING attempts INTO n;
  RETURN n <= p_limit;
END $$;

-- Scope revocations to this application's functions; preserve unrelated RPCs.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('consume_magic_token','create_cv_atomic','save_cv_draft','snapshot_cv','restore_cv','prevent_snapshot_update','publish_cv','take_rate_limit','clean_expired_tokens','increment_cv_view_count','update_updated_at_column')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.signature);
  END LOOP;
END $$;
COMMIT;
