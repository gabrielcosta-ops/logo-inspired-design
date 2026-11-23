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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      level_changes: {
        Row: {
          created_at: string
          from_rank: number
          id: string
          player_id: string
          reason: string | null
          to_rank: number
        }
        Insert: {
          created_at?: string
          from_rank: number
          id?: string
          player_id: string
          reason?: string | null
          to_rank: number
        }
        Update: {
          created_at?: string
          from_rank?: number
          id?: string
          player_id?: string
          reason?: string | null
          to_rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_changes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          id: string
          min_assists: number
          min_goals: number
          name: string
          rank: number
        }
        Insert: {
          created_at?: string
          id?: string
          min_assists?: number
          min_goals?: number
          name: string
          rank: number
        }
        Update: {
          created_at?: string
          id?: string
          min_assists?: number
          min_goals?: number
          name?: string
          rank?: number
        }
        Relationships: []
      }
      match_events: {
        Row: {
          assist_player_id: string | null
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
          season_id: string | null
          team: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          assist_player_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
          season_id?: string | null
          team: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          assist_player_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
          season_id?: string | null
          team?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          match_id: string
          player_id: string
          team: string
        }
        Insert: {
          match_id: string
          player_id: string
          team: string
        }
        Update: {
          match_id?: string
          player_id?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          clock_offset_seconds: number
          clock_started_at: string | null
          created_at: string
          finished_at: string | null
          id: string
          played_at: string
          season_id: string
          status: string
          team_a_name: string
          team_b_name: string
          winner: string | null
        }
        Insert: {
          clock_offset_seconds?: number
          clock_started_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          played_at?: string
          season_id: string
          status?: string
          team_a_name?: string
          team_b_name?: string
          winner?: string | null
        }
        Update: {
          clock_offset_seconds?: number
          clock_started_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          played_at?: string
          season_id?: string
          status?: string
          team_a_name?: string
          team_b_name?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          id: string
          level_rank: number
          name: string
          nickname: string
          photo_url: string | null
          position: Database["public"]["Enums"]["player_position"]
          shirt_number: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          level_rank?: number
          name: string
          nickname: string
          photo_url?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          shirt_number?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          level_rank?: number
          name?: string
          nickname?: string
          photo_url?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          shirt_number?: number | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          ended_at: string | null
          id: string
          is_current: boolean
          name: string
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name: string
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          is_current?: boolean
          name?: string
          started_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          assist_points: number
          goal_points: number
          id: number
          updated_at: string
        }
        Insert: {
          assist_points?: number
          goal_points?: number
          id?: number
          updated_at?: string
        }
        Update: {
          assist_points?: number
          goal_points?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
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
      close_season: {
        Args: { p_new_name: string; p_reset: boolean }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_player_level: {
        Args: { p_player: string; p_rank: number; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
      event_type: "goal" | "own_goal" | "yellow" | "red"
      player_position: "goleiro" | "zagueiro" | "meia" | "atacante"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
      event_type: ["goal", "own_goal", "yellow", "red"],
      player_position: ["goleiro", "zagueiro", "meia", "atacante"],
    },
  },
} as const
