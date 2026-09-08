/**
 * TraceVerse domain model + seed catalogue.
 *
 * These types mirror the intended backend entities (Book, Chapter, Author,
 * Community, Post, ...) so screens can be wired to real data later without
 * changing component contracts.
 */

export type AgeRating = "everyone" | "teen" | "young-adult" | "mature";

export type ContentKind =
  | "book"
  | "story"
  | "comic"
  | "poem"
  | "article"
  | "essay"
  | "confession"
  | "series";

export interface Author {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
  bio: string;
  country: string;
  followers: number;
  readers: number;
  hue: number;
  works: string[];
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  minutes: number;
  discussions: number;
  excerpt: string;
  /** Real extracted body text, when the chapter came from an import. */
  paragraphs?: string[];
}

export interface Book {
  id: string;
  title: string;
  authorId: string;
  kind: ContentKind;
  genre: string;
  language: string;
  ageRating: AgeRating;
  rating: number;
  readers: number;
  followers: number;
  year: number;
  hue: number;
  summary: string;
  tags: string[];
  chapters: Chapter[];
  communityId?: string;
  audiobook: boolean;
  progress?: number;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  posts: number;
  hue: number;
  official?: boolean;
  bookId?: string;
}

export interface FeedPost {
  id: string;
  kind: "excerpt" | "quote" | "confession" | "discussion" | "comic" | "author-note";
  author: string;
  handle: string;
  hue: number;
  time: string;
  body: string;
  bookTitle?: string;
  likes: number;
  comments: number;
  spoiler?: boolean;
}

const chapter = (
  index: number,
  title: string,
  minutes: number,
  discussions: number,
  excerpt: string,
): Chapter => ({ id: `ch-${index}`, index, title, minutes, discussions, excerpt });

export const authors: Author[] = [
  {
    id: "amara-njoki",
    name: "Amara Njoki",
    handle: "@amaranjoki",
    verified: true,
    bio: "Nairobi-born novelist writing about rivers, migration and the people between them.",
    country: "Kenya",
    followers: 1_240_000,
    readers: 8_400_000,
    hue: 300,
    works: ["the-river-between-us", "salt-and-sunlight"],
  },
  {
    id: "kofi-mensah",
    name: "Kofi Mensah",
    handle: "@kofiwrites",
    verified: true,
    bio: "Speculative fiction, Accra. Building futures that remember where they came from.",
    country: "Ghana",
    followers: 412_000,
    readers: 2_100_000,
    hue: 268,
    works: ["lagos-2140"],
  },
  {
    id: "sena-okoth",
    name: "Sena Okoth",
    handle: "@senaokoth",
    verified: false,
    bio: "New voice. Campus stories, quiet heartbreaks, loud friendships.",
    country: "Kenya",
    followers: 8_900,
    readers: 41_000,
    hue: 338,
    works: ["the-hostel-tapes"],
  },
  {
    id: "lin-wei",
    name: "Lin Wei",
    handle: "@linwei",
    verified: true,
    bio: "Comic artist. Vertical scroll worlds, ink and neon.",
    country: "Singapore",
    followers: 233_000,
    readers: 1_020_000,
    hue: 210,
    works: ["neon-koi"],
  },
  {
    id: "tara-hale",
    name: "Tara Hale",
    handle: "@tarahale",
    verified: false,
    bio: "Writing about focus, habits and the quiet economics of attention.",
    country: "United Kingdom",
    followers: 64_500,
    readers: 380_000,
    hue: 160,
    works: ["small-deliberate-things"],
  },
];

export const books: Book[] = [
  {
    id: "the-river-between-us",
    title: "The River Between Us",
    authorId: "amara-njoki",
    kind: "book",
    genre: "African Literature",
    language: "English",
    ageRating: "young-adult",
    rating: 4.8,
    readers: 128_400,
    followers: 41_200,
    year: 2024,
    hue: 300,
    summary:
      "Two villages, one river, and a generation that refuses to inherit the silence. A sweeping story about water, memory and the cost of crossing over.",
    tags: ["literary", "family", "identity", "coming of age"],
    audiobook: true,
    progress: 0.42,
    communityId: "river-readers",
    chapters: [
      chapter(1, "The Crossing", 14, 1_204, "The river had a name before any of us did."),
      chapter(2, "Salt Season", 11, 842, "Mother measured the year in what the water took."),
      chapter(3, "What the Boatman Knew", 16, 2_310, "He never charged children. That was the rule."),
      chapter(4, "Dry Bed", 12, 640, "For eleven days the river forgot how to be a river."),
      chapter(5, "The Other Bank", 18, 3_905, "They looked like us, which was the hardest part."),
      chapter(6, "Names We Carried", 13, 1_115, "A name is a small country you cannot leave."),
      chapter(7, "Flood Light", 15, 2_004, "The water came back like an argument finally won."),
      chapter(8, "The Trace", 19, 4_821, "Every story leaves a trace, and this one left a river."),
    ],
  },
  {
    id: "lagos-2140",
    title: "Lagos 2140",
    authorId: "kofi-mensah",
    kind: "book",
    genre: "Science Fiction",
    language: "English",
    ageRating: "teen",
    rating: 4.6,
    readers: 86_100,
    followers: 22_800,
    year: 2025,
    hue: 268,
    summary:
      "A hundred years after the water rose, the city floats — and its archivists are the only people who remember the ground.",
    tags: ["solarpunk", "afrofuturism", "mystery"],
    audiobook: true,
    progress: 0.11,
    communityId: "afrofuturists",
    chapters: [
      chapter(1, "Tidewatch", 12, 402, "The city breathed twice a day, like everything else here."),
      chapter(2, "Archive Nine", 15, 288, "Paper was illegal, which made it valuable."),
      chapter(3, "Ground Truth", 17, 512, "Somebody had been editing the past."),
      chapter(4, "Deep Current", 14, 331, "The current knew the way better than the maps."),
    ],
  },
  {
    id: "the-hostel-tapes",
    title: "The Hostel Tapes",
    authorId: "sena-okoth",
    kind: "story",
    genre: "Campus",
    language: "English",
    ageRating: "young-adult",
    rating: 4.4,
    readers: 12_900,
    followers: 3_400,
    year: 2026,
    hue: 338,
    summary:
      "Recorded at 2am on a cracked phone: four roommates, one semester, and everything they never said out loud.",
    tags: ["friendship", "romance", "hidden gem"],
    audiobook: false,
    chapters: [
      chapter(1, "Tape One: Orientation", 9, 88, "Press record. Say your name."),
      chapter(2, "Tape Two: Rent Week", 8, 64, "We split everything except the truth."),
      chapter(3, "Tape Three: The Fight", 10, 143, "You can hear the door in the background."),
    ],
  },
  {
    id: "neon-koi",
    title: "Neon Koi",
    authorId: "lin-wei",
    kind: "comic",
    genre: "Comics",
    language: "English",
    ageRating: "teen",
    rating: 4.9,
    readers: 204_000,
    followers: 77_000,
    year: 2025,
    hue: 210,
    summary:
      "A vertical-scroll comic about a courier who delivers memories through a flooded neon district.",
    tags: ["vertical scroll", "cyberpunk", "episodic"],
    audiobook: false,
    progress: 0.68,
    chapters: [
      chapter(1, "Episode 1: Delivery", 6, 920, "She never opened the packages. Until she did."),
      chapter(2, "Episode 2: Undertow", 7, 741, "Memories keep badly in salt water."),
      chapter(3, "Episode 3: Koi", 6, 1_402, "The fish were the only thing not for sale."),
    ],
  },
  {
    id: "small-deliberate-things",
    title: "Small, Deliberate Things",
    authorId: "tara-hale",
    kind: "book",
    genre: "Self-help",
    language: "English",
    ageRating: "everyone",
    rating: 4.5,
    readers: 58_700,
    followers: 14_200,
    year: 2025,
    hue: 160,
    summary:
      "Not another productivity system. A quiet argument for doing fewer things with much more attention.",
    tags: ["habits", "focus", "essays"],
    audiobook: true,
    chapters: [
      chapter(1, "The Attention Budget", 10, 210, "You are already spending it. The only question is where."),
      chapter(2, "Fewer, Better", 9, 176, "Subtraction is a skill nobody teaches."),
      chapter(3, "The Two-Week Test", 11, 143, "Most systems fail on day nine."),
    ],
  },
  {
    id: "salt-and-sunlight",
    title: "Salt and Sunlight",
    authorId: "amara-njoki",
    kind: "book",
    genre: "Romance",
    language: "English",
    ageRating: "young-adult",
    rating: 4.7,
    readers: 94_300,
    followers: 26_500,
    year: 2023,
    hue: 24,
    summary:
      "A coastal summer, a failing hotel, and two people who keep meeting at exactly the wrong hour.",
    tags: ["romance", "slow burn", "coastal"],
    audiobook: true,
    chapters: [
      chapter(1, "Low Tide", 11, 512, "He was early. She was never early."),
      chapter(2, "Room Fourteen", 12, 604, "The key stuck. It always stuck."),
      chapter(3, "Sunlight Hours", 13, 733, "Summer ends the way arguments do — suddenly."),
    ],
  },
];

export const communities: Community[] = [
  {
    id: "river-readers",
    name: "Readers of The River Between Us",
    description:
      "Chapter-by-chapter discussion, theories and quotes for Amara Njoki's modern classic.",
    members: 24_000,
    posts: 8_412,
    hue: 300,
    official: true,
    bookId: "the-river-between-us",
  },
  {
    id: "african-literature",
    name: "African Literature",
    description: "Novels, essays and poetry from across the continent and its diaspora.",
    members: 186_000,
    posts: 41_900,
    hue: 42,
  },
  {
    id: "afrofuturists",
    name: "Afrofuturists",
    description: "Speculative worlds, solarpunk cities and the futures we are owed.",
    members: 73_400,
    posts: 19_200,
    hue: 268,
  },
  {
    id: "aspiring-authors",
    name: "Aspiring Authors",
    description: "Drafts, critique circles and publishing questions. New writers welcome.",
    members: 302_000,
    posts: 96_000,
    hue: 200,
  },
  {
    id: "confession-booth",
    name: "The Confession Booth",
    description: "Anonymous stories, moderated with care. Be kind or be gone.",
    members: 511_000,
    posts: 240_000,
    hue: 338,
  },
  {
    id: "vertical-comics",
    name: "Vertical Comics",
    description: "Scroll-first comics, episode drops and artist AMAs.",
    members: 128_000,
    posts: 33_100,
    hue: 210,
  },
];

export const feed: FeedPost[] = [
  {
    id: "p1",
    kind: "quote",
    author: "Amara Njoki",
    handle: "@amaranjoki",
    hue: 300,
    time: "2h",
    body: "“A name is a small country you cannot leave.”",
    bookTitle: "The River Between Us",
    likes: 12_400,
    comments: 831,
  },
  {
    id: "p2",
    kind: "discussion",
    author: "Wanjiru K.",
    handle: "@wanjiru",
    hue: 42,
    time: "4h",
    body: "Chapter 8 completely reframes the boatman. I don't think he was ever neutral — reread the crossing scene with that in mind.",
    bookTitle: "The River Between Us",
    likes: 3_120,
    comments: 412,
    spoiler: true,
  },
  {
    id: "p3",
    kind: "confession",
    author: "Anonymous",
    handle: "confession",
    hue: 338,
    time: "6h",
    body: "I've told everyone I finished the book. I stopped at chapter three. I just liked being the kind of person who was reading it.",
    likes: 48_900,
    comments: 2_204,
  },
  {
    id: "p4",
    kind: "comic",
    author: "Lin Wei",
    handle: "@linwei",
    hue: 210,
    time: "9h",
    body: "Episode 3 is live. The koi panel took eleven days and I'd do it again.",
    bookTitle: "Neon Koi",
    likes: 21_700,
    comments: 1_140,
  },
  {
    id: "p5",
    kind: "excerpt",
    author: "Sena Okoth",
    handle: "@senaokoth",
    hue: 338,
    time: "1d",
    body: "Press record. Say your name. Say it like you mean it, because in three months you won't recognise the voice.",
    bookTitle: "The Hostel Tapes",
    likes: 1_860,
    comments: 204,
  },
];

export const genres = [
  "Fiction",
  "Romance",
  "Fantasy",
  "Adventure",
  "Mystery",
  "Thriller",
  "African Literature",
  "Business",
  "Technology",
  "History",
  "Religion",
  "Poetry",
  "Drama",
  "Comics",
  "Manga",
  "Self-help",
  "Science",
  "Health",
  "Travel",
  "Cooking",
  "Parenting",
  "Children",
  "Confessions",
  "Essays",
  "Articles",
];

export const getAuthor = (id: string) => authors.find((a) => a.id === id);
export const getBook = (id: string) => books.find((b) => b.id === id);
export const getCommunity = (id: string) => communities.find((c) => c.id === id);
export const authorOf = (book: Book) => getAuthor(book.authorId)!;

export const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
};
