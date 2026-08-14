-- ===== enums =====
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.content_kind AS ENUM ('book','story','comic','poem','article','essay','confession','series');
CREATE TYPE public.age_rating AS ENUM ('everyone','teen','young-adult','mature');
CREATE TYPE public.book_status AS ENUM ('draft','processing','published','removed');
CREATE TYPE public.post_kind AS ENUM ('excerpt','quote','confession','discussion','comic','author-note');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE,
  display_name text NOT NULL DEFAULT 'Reader',
  bio text NOT NULL DEFAULT '',
  country text,
  birth_year int,
  hue int NOT NULL DEFAULT 300,
  author_id text,
  streak_days int NOT NULL DEFAULT 0,
  minutes_read int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, handle)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1), 'Reader'),
    'u' || substr(replace(NEW.id::text,'-',''),1,10)
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

-- ===== roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== authors =====
CREATE TABLE public.authors (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  handle text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  bio text NOT NULL DEFAULT '',
  country text,
  followers int NOT NULL DEFAULT 0,
  readers int NOT NULL DEFAULT 0,
  hue int NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.authors TO authenticated;
GRANT SELECT ON public.authors TO anon;
GRANT ALL ON public.authors TO service_role;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authors readable" ON public.authors FOR SELECT USING (true);
CREATE POLICY "own author insert" ON public.authors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own author update" ON public.authors FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE TRIGGER t_authors_updated BEFORE UPDATE ON public.authors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== communities =====
CREATE TABLE public.communities (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  members int NOT NULL DEFAULT 0,
  posts int NOT NULL DEFAULT 0,
  hue int NOT NULL DEFAULT 300,
  official boolean NOT NULL DEFAULT false,
  book_id text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.communities TO authenticated;
GRANT SELECT ON public.communities TO anon;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communities readable" ON public.communities FOR SELECT USING (true);
CREATE POLICY "create community" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner updates community" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);

-- ===== books =====
CREATE TABLE public.books (
  id text PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  author_id text NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  kind public.content_kind NOT NULL DEFAULT 'book',
  genre text NOT NULL DEFAULT 'Fiction',
  language text NOT NULL DEFAULT 'English',
  age_rating public.age_rating NOT NULL DEFAULT 'everyone',
  rating numeric(2,1) NOT NULL DEFAULT 0,
  readers int NOT NULL DEFAULT 0,
  followers int NOT NULL DEFAULT 0,
  year int NOT NULL DEFAULT extract(year from now()),
  hue int NOT NULL DEFAULT 300,
  summary text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  audiobook boolean NOT NULL DEFAULT false,
  community_id text REFERENCES public.communities(id) ON DELETE SET NULL,
  status public.book_status NOT NULL DEFAULT 'draft',
  source_path text,
  source_kind text,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX books_status_idx ON public.books(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT SELECT ON public.books TO anon;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published books readable" ON public.books FOR SELECT USING (status = 'published');
CREATE POLICY "owner reads own books" ON public.books FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner creates books" ON public.books FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner updates books" ON public.books FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY "owner deletes books" ON public.books FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER t_books_updated BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== chapters =====
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  idx int NOT NULL,
  title text NOT NULL,
  minutes int NOT NULL DEFAULT 5,
  discussions int NOT NULL DEFAULT 0,
  excerpt text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, idx)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT SELECT ON public.chapters TO anon;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters of published books readable" ON public.chapters FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND (b.status = 'published' OR b.owner_id = auth.uid())));
CREATE POLICY "owner writes chapters" ON public.chapters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_id AND b.owner_id = auth.uid()));

ALTER TABLE public.communities ADD CONSTRAINT communities_book_fk FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ===== posts =====
CREATE TABLE public.posts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  community_id text REFERENCES public.communities(id) ON DELETE CASCADE,
  book_id text REFERENCES public.books(id) ON DELETE SET NULL,
  kind public.post_kind NOT NULL DEFAULT 'discussion',
  author_name text NOT NULL DEFAULT 'Anonymous',
  handle text NOT NULL DEFAULT 'anonymous',
  hue int NOT NULL DEFAULT 300,
  body text NOT NULL,
  book_title text,
  likes int NOT NULL DEFAULT 0,
  comments int NOT NULL DEFAULT 0,
  spoiler boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_idx ON public.posts(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.posts FOR SELECT USING (hidden = false);
CREATE POLICY "create post" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edit own post" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin')) WITH CHECK (true);
CREATE POLICY "delete own post" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'admin'));

-- ===== comments =====
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.comments FOR SELECT USING (hidden = false);
CREATE POLICY "create comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "manage own comment" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator')) WITH CHECK (true);
CREATE POLICY "delete own comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'moderator'));

-- ===== reactions =====
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id text REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id, comment_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT SELECT ON public.reactions TO anon;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions readable" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "own reaction" ON public.reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "remove own reaction" ON public.reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== reviews =====
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "own review write" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== memberships / follows / bookmarks =====
CREATE TABLE public.community_members (
  community_id text NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_members TO authenticated;
GRANT SELECT ON public.community_members TO anon;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships readable" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "join community" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave community" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('author','book','community','user')),
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable" ON public.follows FOR SELECT USING (true);
CREATE POLICY "own follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  shelf text NOT NULL DEFAULT 'saved',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== reading progress & history =====
CREATE TABLE public.reading_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_idx int NOT NULL DEFAULT 1,
  progress numeric(4,3) NOT NULL DEFAULT 0,
  minutes int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.reading_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_idx int,
  minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reading_history TO authenticated;
GRANT ALL ON public.reading_history TO service_role;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON public.reading_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own history insert" ON public.reading_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ===== notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mark own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== gamification =====
CREATE TABLE public.badges (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT ON public.user_badges TO anon;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user badges readable" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "own badge insert" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

INSERT INTO public.badges (id,label,description) VALUES
('first-trace','First Trace','Finished your first chapter'),
('night-reader','Night Reader','Read after midnight five times'),
('community-voice','Community Voice','Ten discussions started'),
('curator','Curator','Bookmarked twenty five stories');

-- ===== Trace AI usage =====
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  task text NOT NULL,
  model text NOT NULL,
  context_ref text,
  input_chars int NOT NULL DEFAULT 0,
  output_chars int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_idx ON public.ai_usage(user_id, created_at DESC);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai usage" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== uploads =====
CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id text REFERENCES public.books(id) ON DELETE SET NULL,
  path text NOT NULL,
  filename text NOT NULL,
  mime text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'uploaded',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own uploads" ON public.uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own upload insert" ON public.uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own upload update" ON public.uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);