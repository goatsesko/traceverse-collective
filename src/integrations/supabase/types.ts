export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          context_ref: string | null
          created_at: string
          id: string
          input_chars: number
          model: string
          output_chars: number
          task: string
          user_id: string | null
        }
        Insert: {
          context_ref?: string | null
          created_at?: string
          id?: string
          input_chars?: number
          model: string
          output_chars?: number
          task: string
          user_id?: string | null
        }
        Update: {
          context_ref?: string | null
          created_at?: string
          id?: string
          input_chars?: number
          model?: string
          output_chars?: number
          task?: string
          user_id?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          bio: string
          country: string | null
          created_at: string
          followers: number
          handle: string
          hue: number
          id: string
          name: string
          readers: number
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          bio?: string
          country?: string | null
          created_at?: string
          followers?: number
          handle: string
          hue?: number
          id: string
          name: string
          readers?: number
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          bio?: string
          country?: string | null
          created_at?: string
          followers?: number
          handle?: string
          hue?: number
          id?: string
          name?: string
          readers?: number
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      badges: {
        Row: {
          description: string
          id: string
          label: string
        }
        Insert: {
          description?: string
          id: string
          label: string
        }
        Update: {
          description?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          book_id: string
          created_at: string
          shelf: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          shelf?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          shelf?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          age_rating: Database["public"]["Enums"]["age_rating"]
          audiobook: boolean
          author_id: string
          community_id: string | null
          created_at: string
          followers: number
          genre: string
          hue: number
          id: string
          kind: Database["public"]["Enums"]["content_kind"]
          language: string
          owner_id: string | null
          processing_error: string | null
          rating: number
          readers: number
          source_kind: string | null
          source_path: string | null
          status: Database["public"]["Enums"]["book_status"]
          summary: string
          tags: string[]
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          age_rating?: Database["public"]["Enums"]["age_rating"]
          audiobook?: boolean
          author_id: string
          community_id?: string | null
          created_at?: string
          followers?: number
          genre?: string
          hue?: number
          id: string
          kind?: Database["public"]["Enums"]["content_kind"]
          language?: string
          owner_id?: string | null
          processing_error?: string | null
          rating?: number
          readers?: number
          source_kind?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          summary?: string
          tags?: string[]
          title: string
          updated_at?: string
          year?: number
        }
        Update: {
          age_rating?: Database["public"]["Enums"]["age_rating"]
          audiobook?: boolean
          author_id?: string
          community_id?: string | null
          created_at?: string
          followers?: number
          genre?: string
          hue?: number
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          language?: string
          owner_id?: string | null
          processing_error?: string | null
          rating?: number
          readers?: number
          source_kind?: string | null
          source_path?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          blocks: Json
          body_html: string
          book_id: string
          created_at: string
          discussions: number
          excerpt: string
          id: string
          idx: number
          minutes: number
          title: string
        }
        Insert: {
          blocks?: Json
          body_html?: string
          book_id: string
          created_at?: string
          discussions?: number
          excerpt?: string
          id?: string
          idx: number
          minutes?: number
          title: string
        }
        Update: {
          blocks?: Json
          body_html?: string
          book_id?: string
          created_at?: string
          discussions?: number
          excerpt?: string
          id?: string
          idx?: number
          minutes?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          hidden: boolean
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          book_id: string | null
          created_at: string
          description: string
          hue: number
          id: string
          members: number
          name: string
          official: boolean
          owner_id: string | null
          posts: number
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          description?: string
          hue?: number
          id: string
          members?: number
          name: string
          official?: boolean
          owner_id?: string | null
          posts?: number
        }
        Update: {
          book_id?: string | null
          created_at?: string
          description?: string
          hue?: number
          id?: string
          members?: number
          name?: string
          official?: boolean
          owner_id?: string | null
          posts?: number
        }
        Relationships: [
          {
            foreignKeyName: "communities_book_fk"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_name: string
          body: string
          book_id: string | null
          book_title: string | null
          comments: number
          community_id: string | null
          created_at: string
          handle: string
          hidden: boolean
          hue: number
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          likes: number
          spoiler: boolean
          user_id: string | null
        }
        Insert: {
          author_name?: string
          body: string
          book_id?: string | null
          book_title?: string | null
          comments?: number
          community_id?: string | null
          created_at?: string
          handle?: string
          hidden?: boolean
          hue?: number
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          likes?: number
          spoiler?: boolean
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          book_id?: string | null
          book_title?: string | null
          comments?: number
          community_id?: string | null
          created_at?: string
          handle?: string
          hidden?: boolean
          hue?: number
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          likes?: number
          spoiler?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          author_id: string | null
          bio: string
          birth_year: number | null
          country: string | null
          created_at: string
          display_name: string
          handle: string | null
          hue: number
          id: string
          minutes_read: number
          streak_days: number
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          bio?: string
          birth_year?: number | null
          country?: string | null
          created_at?: string
          display_name?: string
          handle?: string | null
          hue?: number
          id: string
          minutes_read?: number
          streak_days?: number
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          bio?: string
          birth_year?: number | null
          country?: string | null
          created_at?: string
          display_name?: string
          handle?: string | null
          hue?: number
          id?: string
          minutes_read?: number
          streak_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          emoji: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_history: {
        Row: {
          book_id: string
          chapter_idx: number | null
          created_at: string
          id: string
          minutes: number
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_idx?: number | null
          created_at?: string
          id?: string
          minutes?: number
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_idx?: number | null
          created_at?: string
          id?: string
          minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          chapter_idx: number
          minutes: number
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_idx?: number
          minutes?: number
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_idx?: number
          minutes?: number
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          book_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          body?: string
          book_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          body?: string
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          book_id: string | null
          created_at: string
          error: string | null
          filename: string
          id: string
          mime: string
          path: string
          size_bytes: number
          status: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          error?: string | null
          filename: string
          id?: string
          mime: string
          path: string
          size_bytes?: number
          status?: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          error?: string | null
          filename?: string
          id?: string
          mime?: string
          path?: string
          size_bytes?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      age_rating: "everyone" | "teen" | "young-adult" | "mature"
      app_role: "admin" | "moderator" | "user"
      book_status: "draft" | "processing" | "published" | "removed"
      content_kind:
        | "book"
        | "story"
        | "comic"
        | "poem"
        | "article"
        | "essay"
        | "confession"
        | "series"
      post_kind:
        | "excerpt"
        | "quote"
        | "confession"
        | "discussion"
        | "comic"
        | "author-note"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      age_rating: ["everyone", "teen", "young-adult", "mature"],
      app_role: ["admin", "moderator", "user"],
      book_status: ["draft", "processing", "published", "removed"],
      content_kind: [
        "book",
        "story",
        "comic",
        "poem",
        "article",
        "essay",
        "confession",
        "series",
      ],
      post_kind: [
        "excerpt",
        "quote",
        "confession",
        "discussion",
        "comic",
        "author-note",
      ],
    },
  },
} as const
