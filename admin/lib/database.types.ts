
export type Database = {
  public: {
    Tables: {
      match_sets: {
        Row: {
          match_id: string
          p1_score: number
          p2_score: number
          set_number: number
        }
        Insert: {
          match_id: string
          p1_score: number
          p2_score: number
          set_number: number
        }
        Update: {
          match_id?: string
          p1_score?: number
          p2_score?: number
          set_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          id: string
          player1_id: string
          player2_id: string
          round: string
          tournament_id: string
          winner_id: string
        }
        Insert: {
          id?: string
          player1_id: string
          player2_id: string
          round: string
          tournament_id: string
          winner_id: string
        }
        Update: {
          id?: string
          player1_id?: string
          player2_id?: string
          round?: string
          tournament_id?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_types: {
        Row: {
          id: string
          name: string
          passes_quantity: number
          points_value: number
          price: string
          stripe_price_id: string
        }
        Insert: {
          id?: string
          name: string
          passes_quantity: number
          points_value: number
          price?: string
          stripe_price_id: string
        }
        Update: {
          id?: string
          name?: string
          passes_quantity?: number
          points_value?: number
          price?: string
          stripe_price_id?: string
        }
        Relationships: []
      }
      passes: {
        Row: {
          id: string
          pass_type_id: string
          purchased_at: string | null
          quantity_remaining: number
          quantity_total: number
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          pass_type_id: string
          purchased_at?: string | null
          quantity_remaining: number
          quantity_total: number
          stripe_session_id: string
          user_id: string
        }
        Update: {
          id?: string
          pass_type_id?: string
          purchased_at?: string | null
          quantity_remaining?: number
          quantity_total?: number
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passes_pass_type_id_fkey"
            columns: ["pass_type_id"]
            isOneToOne: false
            referencedRelation: "pass_types"
            referencedColumns: ["id"]
          },
        ]
      }
      player_tournament_points: {
        Row: {
          player_id: string
          points: number
          seed: number | null
          tournament_id: string
        }
        Insert: {
          player_id: string
          points: number
          seed?: number | null
          tournament_id: string
        }
        Update: {
          player_id?: string
          points?: number
          seed?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birthdate: string | null
          created_at: string
          fullbody_url: string | null
          headshot_url: string | null
          hometown: string | null
          id: string
          name: string
          profile_id: string | null
          slug: string
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          fullbody_url?: string | null
          headshot_url?: string | null
          hometown?: string | null
          id?: string
          name: string
          profile_id?: string | null
          slug: string
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          fullbody_url?: string | null
          headshot_url?: string | null
          hometown?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          current_city: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          current_city?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          current_city?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          id: string
          pass_id: string | null
          registered_at: string | null
          stripe_session_id: string | null
          tournament_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          pass_id?: string | null
          registered_at?: string | null
          stripe_session_id?: string | null
          tournament_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          pass_id?: string | null
          registered_at?: string | null
          stripe_session_id?: string | null
          tournament_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          date: string
          date_actual: string | null
          description: string
          id: string
          location: string
          max_participants: number | null
          name: string
          points_value: number
          prize: string | null
          registration_fee: string | null
          time: string
        }
        Insert: {
          date: string
          date_actual?: string | null
          description: string
          id: string
          location: string
          max_participants?: number | null
          name: string
          points_value?: number
          prize?: string | null
          registration_fee?: string | null
          time: string
        }
        Update: {
          date?: string
          date_actual?: string | null
          description?: string
          id?: string
          location?: string
          max_participants?: number | null
          name?: string
          points_value?: number
          prize?: string | null
          registration_fee?: string | null
          time?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_rankings: {
        Row: {
          current_rank: number | null
          player_id: string | null
          total_points: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_records: {
        Row: {
          losses: number | null
          player_id: string | null
          wins: number | null
        }
        Relationships: []
      }
      player_results: {
        Row: {
          player_id: string | null
          points: number | null
          tournament_id: string | null
        }
        Insert: {
          player_id?: string | null
          points?: number | null
          tournament_id?: string | null
        }
        Update: {
          player_id?: string | null
          points?: number | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "player_records"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "player_tournament_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournament_with_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_tournament_points_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_with_counts: {
        Row: {
          current_participants: number | null
          date: string | null
          description: string | null
          id: string | null
          location: string | null
          max_participants: number | null
          name: string | null
          points_value: number | null
          prize: string | null
          registration_fee: string | null
          time: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_pass_and_register: {
        Args: { pass_id: string; user_id: string; tournament_id: string }
        Returns: undefined
      }
      get_match_details_by_tournament: {
        Args: { p_tournament_id: string }
        Returns: {
          match_id: string
          round: string
          player1_slug: string
          player1_name: string
          player1_seed: number
          player2_slug: string
          player2_name: string
          player2_seed: number
          winner_slug: string
          sets: JSON
        }[]
      }
      get_tournament_summary: {
        Args: { p_tournament_id: string }
        Returns: {
          winner: string
          runner_up: string
          score: string
        }[]
      }
      register_for_tournament: {
        Args: { p_tournament_id: string; p_pass_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
