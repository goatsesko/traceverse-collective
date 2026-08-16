INSERT INTO public.authors (id,name,handle,verified,bio,country,followers,readers,hue) VALUES
('amara-njoki','Amara Njoki','@amaranjoki',true,'Nairobi-born novelist writing about rivers, migration and the people between them.','Kenya',1240000,8400000,300),
('kofi-mensah','Kofi Mensah','@kofiwrites',true,'Speculative fiction, Accra. Building futures that remember where they came from.','Ghana',412000,2100000,268),
('sena-okoth','Sena Okoth','@senaokoth',false,'New voice. Campus stories, quiet heartbreaks, loud friendships.','Kenya',8900,41000,338),
('lin-wei','Lin Wei','@linwei',true,'Comic artist. Vertical scroll worlds, ink and neon.','Singapore',233000,1020000,210),
('tara-hale','Tara Hale','@tarahale',false,'Writing about focus, habits and the quiet economics of attention.','United Kingdom',64500,380000,160)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.books (id,title,author_id,kind,genre,language,age_rating,rating,readers,followers,year,hue,summary,tags,audiobook,status) VALUES
('the-river-between-us','The River Between Us','amara-njoki','book','African Literature','English','young-adult',4.8,128400,41200,2024,300,'Two villages, one river, and a generation that refuses to inherit the silence. A sweeping story about water, memory and the cost of crossing over.',ARRAY['literary','family','identity','coming of age'],true,'published'),
('lagos-2140','Lagos 2140','kofi-mensah','book','Science Fiction','English','teen',4.6,86100,22800,2025,268,'A hundred years after the water rose, the city floats — and its archivists are the only people who remember the ground.',ARRAY['solarpunk','afrofuturism','mystery'],true,'published'),
('the-hostel-tapes','The Hostel Tapes','sena-okoth','story','Campus','English','young-adult',4.4,12900,3400,2026,338,'Recorded at 2am on a cracked phone: four roommates, one semester, and everything they never said out loud.',ARRAY['friendship','romance','hidden gem'],false,'published'),
('neon-koi','Neon Koi','lin-wei','comic','Comics','English','teen',4.9,204000,77000,2025,210,'A vertical-scroll comic about a courier who delivers memories through a flooded neon district.',ARRAY['vertical scroll','cyberpunk','episodic'],false,'published'),
('small-deliberate-things','Small, Deliberate Things','tara-hale','book','Self-help','English','everyone',4.5,58700,14200,2025,160,'Not another productivity system. A quiet argument for doing fewer things with much more attention.',ARRAY['habits','focus','essays'],true,'published'),
('salt-and-sunlight','Salt and Sunlight','amara-njoki','book','Romance','English','young-adult',4.7,94300,26500,2023,24,'A coastal summer, a failing hotel, and two people who keep meeting at exactly the wrong hour.',ARRAY['romance','slow burn','coastal'],true,'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.communities (id,name,description,members,posts,hue,official,book_id) VALUES
('river-readers','Readers of The River Between Us','Chapter-by-chapter discussion, theories and quotes for Amara Njoki''s modern classic.',24000,8412,300,true,'the-river-between-us'),
('african-literature','African Literature','Novels, essays and poetry from across the continent and its diaspora.',186000,41900,42,false,NULL),
('afrofuturists','Afrofuturists','Speculative worlds, solarpunk cities and the futures we are owed.',73400,19200,268,false,NULL),
('aspiring-authors','Aspiring Authors','Drafts, critique circles and publishing questions. New writers welcome.',302000,96000,200,false,NULL),
('confession-booth','The Confession Booth','Anonymous stories, moderated with care. Be kind or be gone.',511000,240000,338,false,NULL),
('vertical-comics','Vertical Comics','Scroll-first comics, episode drops and artist AMAs.',128000,33100,210,false,NULL)
ON CONFLICT (id) DO NOTHING;

UPDATE public.books SET community_id='river-readers' WHERE id='the-river-between-us';
UPDATE public.books SET community_id='afrofuturists' WHERE id='lagos-2140';

INSERT INTO public.chapters (book_id,idx,title,minutes,discussions,excerpt,body_html,blocks) 
SELECT v.book_id, v.idx, v.title, v.minutes, v.discussions, v.excerpt, '', '[]'::jsonb
FROM (VALUES ('the-river-between-us',1,'The Crossing',14,1204,'The river had a name before any of us did.'),('the-river-between-us',2,'Salt Season',11,842,'Mother measured the year in what the water took.'),('the-river-between-us',3,'What the Boatman Knew',16,2310,'He never charged children. That was the rule.'),('the-river-between-us',4,'Dry Bed',12,640,'For eleven days the river forgot how to be a river.'),('the-river-between-us',5,'The Other Bank',18,3905,'They looked like us, which was the hardest part.'),('the-river-between-us',6,'Names We Carried',13,1115,'A name is a small country you cannot leave.'),('the-river-between-us',7,'Flood Light',15,2004,'The water came back like an argument finally won.'),('the-river-between-us',8,'The Trace',19,4821,'Every story leaves a trace, and this one left a river.'),('lagos-2140',1,'Tidewatch',12,402,'The city breathed twice a day, like everything else here.'),('lagos-2140',2,'Archive Nine',15,288,'Paper was illegal, which made it valuable.'),('lagos-2140',3,'Ground Truth',17,512,'Somebody had been editing the past.'),('lagos-2140',4,'Deep Current',14,331,'The current knew the way better than the maps.'),('the-hostel-tapes',1,'Tape One: Orientation',9,88,'Press record. Say your name.'),('the-hostel-tapes',2,'Tape Two: Rent Week',8,64,'We split everything except the truth.'),('the-hostel-tapes',3,'Tape Three: The Fight',10,143,'You can hear the door in the background.'),('neon-koi',1,'Episode 1: Delivery',6,920,'She never opened the packages. Until she did.'),('neon-koi',2,'Episode 2: Undertow',7,741,'Memories keep badly in salt water.'),('neon-koi',3,'Episode 3: Koi',6,1402,'The fish were the only thing not for sale.'),('small-deliberate-things',1,'The Attention Budget',10,210,'You are already spending it. The only question is where.'),('small-deliberate-things',2,'Fewer, Better',9,176,'Subtraction is a skill nobody teaches.'),('small-deliberate-things',3,'The Two-Week Test',11,143,'Most systems fail on day nine.'),('salt-and-sunlight',1,'Low Tide',11,512,'He was early. She was never early.'),('salt-and-sunlight',2,'Room Fourteen',12,604,'The key stuck. It always stuck.'),('salt-and-sunlight',3,'Sunlight Hours',13,733,'Summer ends the way arguments do — suddenly.')) AS v(book_id,idx,title,minutes,discussions,excerpt)
WHERE NOT EXISTS (SELECT 1 FROM public.chapters c WHERE c.book_id = v.book_id AND c.idx = v.idx);

UPDATE public.chapters SET
  body_html = '<p>' || excerpt || '</p>'
    || '<p>The morning came the way it always did here, without asking. Somewhere behind the compound a radio argued with itself, and the water carried the sound further than it had any right to.</p>'
    || '<p>We had learned to measure distance in crossings rather than kilometres. Three crossings to the market. One to the school. Half a crossing to the place where the current turned and the boatman would not go.</p>'
    || '<p>My mother said a river remembers everything it has ever carried. I did not believe her until the year it gave something back.</p>'
    || '<p>By evening the light had gone the colour of old brass, and the children were counting boats instead of stars. There were fewer boats than last season. Nobody said why.</p>',
  blocks = jsonb_build_array(
    jsonb_build_object('type','paragraph','text',excerpt),
    jsonb_build_object('type','paragraph','text','The morning came the way it always did here, without asking. Somewhere behind the compound a radio argued with itself, and the water carried the sound further than it had any right to.'),
    jsonb_build_object('type','paragraph','text','We had learned to measure distance in crossings rather than kilometres. Three crossings to the market. One to the school. Half a crossing to the place where the current turned and the boatman would not go.'),
    jsonb_build_object('type','paragraph','text','My mother said a river remembers everything it has ever carried. I did not believe her until the year it gave something back.'),
    jsonb_build_object('type','paragraph','text','By evening the light had gone the colour of old brass, and the children were counting boats instead of stars. There were fewer boats than last season. Nobody said why.')
  )
WHERE body_html = '';

INSERT INTO public.posts (id,kind,author_name,handle,hue,body,book_title,likes,comments,spoiler,book_id,community_id,created_at) VALUES
('p1','quote','Amara Njoki','@amaranjoki',300,'“A name is a small country you cannot leave.”','The River Between Us',12400,831,false,'the-river-between-us','river-readers',now() - interval '2 hours'),
('p2','discussion','Wanjiru K.','@wanjiru',42,'Chapter 8 completely reframes the boatman. I don''t think he was ever neutral — reread the crossing scene with that in mind.','The River Between Us',3120,412,true,'the-river-between-us','river-readers',now() - interval '4 hours'),
('p3','confession','Anonymous','confession',338,'I''ve told everyone I finished the book. I stopped at chapter three. I just liked being the kind of person who was reading it.',NULL,48900,2204,false,NULL,'confession-booth',now() - interval '6 hours'),
('p4','comic','Lin Wei','@linwei',210,'Episode 3 is live. The koi panel took eleven days and I''d do it again.','Neon Koi',21700,1140,false,'neon-koi','vertical-comics',now() - interval '9 hours'),
('p5','excerpt','Sena Okoth','@senaokoth',338,'Press record. Say your name. Say it like you mean it, because in three months you won''t recognise the voice.','The Hostel Tapes',1860,204,false,'the-hostel-tapes',NULL,now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.badges (id,label,description) VALUES
('first-trace','First Trace','Published your first Trace Quote.'),
('streak-7','7-Day Streak','Read every day for a week.'),
('deep-reader','Deep Reader','Finished a book of 8 chapters or more.'),
('community-voice','Community Voice','Started a discussion that got 10 replies.'),
('early-reader','Early Reader','Joined TraceVerse in its first season.')
ON CONFLICT (id) DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;