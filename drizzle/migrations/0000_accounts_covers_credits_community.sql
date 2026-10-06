ALTER TYPE public.post_kind ADD VALUE IF NOT EXISTS 'recommendation';
ALTER TYPE public.post_kind ADD VALUE IF NOT EXISTS 'question';
ALTER TYPE public.post_kind ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE public.post_kind ADD VALUE IF NOT EXISTS 'reading-update';
ALTER TYPE public.post_kind ADD VALUE IF NOT EXISTS 'announcement';

-- Book credits + cover
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS publisher text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_author text;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false;

-- Account types
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'reader';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS professional_since timestamptz;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('reader','professional'));

CREATE OR REPLACE FUNCTION public.guard_account_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.professional_since IS DISTINCT FROM OLD.professional_since)
     AND coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'Account type can only be changed through TraceVerse';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS t_profiles_guard_account ON public.profiles;
CREATE TRIGGER t_profiles_guard_account BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_account_type();

UPDATE public.profiles p SET account_type = 'professional', professional_since = now()
WHERE p.author_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.books b WHERE b.owner_id = p.id);

-- Saved posts
CREATE TABLE IF NOT EXISTS public.post_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saves read" ON public.post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saves insert" ON public.post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saves delete" ON public.post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_post_emoji ON public.reactions(user_id, post_id, emoji) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_created_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_post_idx ON public.comments(post_id, created_at);

-- Real counters
CREATE OR REPLACE FUNCTION public.sync_post_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid text;
BEGIN
  pid := COALESCE(NEW.post_id, OLD.post_id);
  IF pid IS NULL THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'reactions' THEN
    UPDATE public.posts SET likes = (SELECT count(*) FROM public.reactions WHERE post_id = pid) WHERE id = pid;
  ELSE
    UPDATE public.posts SET comments = (SELECT count(*) FROM public.comments WHERE post_id = pid AND hidden = false) WHERE id = pid;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS t_reactions_count ON public.reactions;
CREATE TRIGGER t_reactions_count AFTER INSERT OR DELETE ON public.reactions FOR EACH ROW EXECUTE FUNCTION public.sync_post_counts();
DROP TRIGGER IF EXISTS t_comments_count ON public.comments;
CREATE TRIGGER t_comments_count AFTER INSERT OR DELETE OR UPDATE OF hidden ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_post_counts();