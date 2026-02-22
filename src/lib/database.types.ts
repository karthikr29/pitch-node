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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string | null
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          criteria?: Json
          description: string
          icon?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          accent: string
          behavior_profile: Json
          cartesia_voice_id: string | null
          colors: Json
          created_at: string | null
          description: string
          difficulty_modifiers: Json
          emoji: string
          gender: string
          id: string
          is_active: boolean
          name: string
          persona_type: string
          system_prompt_template: string | null
          title: string
          updated_at: string | null
          voice_variants: Json
        }
        Insert: {
          accent?: string
          behavior_profile?: Json
          cartesia_voice_id?: string | null
          colors?: Json
          created_at?: string | null
          description: string
          difficulty_modifiers?: Json
          emoji?: string
          gender?: string
          id?: string
          is_active?: boolean
          name: string
          persona_type: string
          system_prompt_template?: string | null
          title: string
          updated_at?: string | null
          voice_variants?: Json
        }
        Update: {
          accent?: string
          behavior_profile?: Json
          cartesia_voice_id?: string | null
          colors?: Json
          created_at?: string | null
          description?: string
          difficulty_modifiers?: Json
          emoji?: string
          gender?: string
          id?: string
          is_active?: boolean
          name?: string
          persona_type?: string
          system_prompt_template?: string | null
          title?: string
          updated_at?: string | null
          voice_variants?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          preferred_theme: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          preferred_theme?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          call_type: Database["public"]["Enums"]["call_type"]
          context_briefing: Json
          created_at: string | null
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          evaluation_criteria: Json
          id: string
          objectives: string[]
          title: string
          updated_at: string | null
        }
        Insert: {
          call_type: Database["public"]["Enums"]["call_type"]
          context_briefing?: Json
          created_at?: string | null
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          evaluation_criteria?: Json
          id?: string
          objectives?: string[]
          title: string
          updated_at?: string | null
        }
        Update: {
          call_type?: Database["public"]["Enums"]["call_type"]
          context_briefing?: Json
          created_at?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          evaluation_criteria?: Json
          id?: string
          objectives?: string[]
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      session_analytics: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          highlight_moments: Json | null
          id: string
          improvement_suggestions: string[] | null
          letter_grade: string | null
          overall_score: number | null
          scores: Json
          session_id: string
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          highlight_moments?: Json | null
          id?: string
          improvement_suggestions?: string[] | null
          letter_grade?: string | null
          overall_score?: number | null
          scores?: Json
          session_id: string
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          highlight_moments?: Json | null
          id?: string
          improvement_suggestions?: string[] | null
          letter_grade?: string | null
          overall_score?: number | null
          scores?: Json
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          id: string
          session_id: string
          speaker: string
          timestamp_ms: number
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          id?: string
          session_id: string
          speaker: string
          timestamp_ms: number
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          id?: string
          session_id?: string
          speaker?: string
          timestamp_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          livekit_room_name: string | null
          persona_id: string
          pitch_briefing: Json | null
          pitch_context: string | null
          scenario_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          livekit_room_name?: string | null
          persona_id: string
          pitch_briefing?: Json | null
          pitch_context?: string | null
          scenario_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          livekit_room_name?: string | null
          persona_id?: string
          pitch_briefing?: Json | null
          pitch_context?: string | null
          scenario_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          average_score: number | null
          best_score: number | null
          created_at: string | null
          current_streak: number | null
          id: string
          last_session_date: string | null
          longest_streak: number | null
          scores_by_call_type: Json | null
          scores_by_persona: Json | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_session_date?: string | null
          longest_streak?: number | null
          scores_by_call_type?: Json | null
          scores_by_persona?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_session_date?: string | null
          longest_streak?: number | null
          scores_by_call_type?: Json | null
          scores_by_persona?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string | null
          email: string
          experience_rating: number
          id: string
          job_role: string | null
          name: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience_rating: number
          id?: string
          job_role?: string | null
          name: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience_rating?: number
          id?: string
          job_role?: string | null
          name?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      call_type:
        | "discovery"
        | "demo"
        | "negotiation"
        | "cold_call"
        | "follow_up"
        | "closing"
        | "objection"
        | "pitch"
      difficulty_level: "easy" | "medium" | "hard" | "expert"
      session_status:
        | "connecting"
        | "active"
        | "completed"
        | "error"
        | "abandoned"
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
      call_type: [
        "discovery",
        "demo",
        "negotiation",
        "cold_call",
        "follow_up",
        "closing",
        "objection",
        "pitch",
      ],
      difficulty_level: ["easy", "medium", "hard", "expert"],
      session_status: [
        "connecting",
        "active",
        "completed",
        "error",
        "abandoned",
      ],
    },
  },
} as const
