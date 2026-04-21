-- Migration: Add explicit billing tier to users
-- Safe to run multiple times (idempotent)

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Table public.users does not exist. Run 001-create-tables.sql first.';
  END IF;
END $$;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20);

DO $$
DECLARE
  has_preferences BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'preferences'
  ) INTO has_preferences;

  IF has_preferences THEN
    EXECUTE $q$
      UPDATE public.users
      SET plan_tier = CASE
        WHEN COALESCE(preferences->>'tier', 'free') = 'pro' THEN 'pro'
        ELSE 'free'
      END
      WHERE plan_tier IS NULL OR plan_tier NOT IN ('free', 'pro')
    $q$;
  ELSE
    EXECUTE $q$
      UPDATE public.users
      SET plan_tier = 'free'
      WHERE plan_tier IS NULL OR plan_tier NOT IN ('free', 'pro')
    $q$;
  END IF;
END $$;

ALTER TABLE public.users
ALTER COLUMN plan_tier SET DEFAULT 'free';

UPDATE public.users
SET plan_tier = 'free'
WHERE plan_tier IS NULL;

ALTER TABLE public.users
ALTER COLUMN plan_tier SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_plan_tier_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_plan_tier_check
    CHECK (plan_tier IN ('free', 'pro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_plan_tier
ON public.users(plan_tier);

COMMIT;

-- Validation queries (optional)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan_tier';
--
-- SELECT id, email, plan_tier, preferences->>'tier' AS legacy_tier
-- FROM public.users
-- ORDER BY created_at DESC;

