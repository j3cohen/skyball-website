
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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      inventory_bill_of_materials: {
        Row: {
          component_product_id: number
          created_at: string
          id: number
          kit_product_id: number
          quantity: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          component_product_id: number
          created_at?: string
          id?: number
          kit_product_id: number
          quantity: number
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          component_product_id?: number
          created_at?: string
          id?: number
          kit_product_id?: number
          quantity?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_bill_of_materials_kit_product_id_fkey"
            columns: ["kit_product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_inventory_transactions: {
        Row: {
          change_qty: number
          date: string
          id: number
          product_id: number
          reference_id: number | null
          txn_type: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          change_qty: number
          date?: string
          id?: number
          product_id: number
          reference_id?: number | null
          txn_type: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          change_qty?: number
          date?: string
          id?: number
          product_id?: number
          reference_id?: number | null
          txn_type?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_notifications: {
        Row: {
          id: number
          notified_at: string
          on_hand: number
          product_id: number
          reorder_level: number
          updated_at: string
        }
        Insert: {
          id?: number
          notified_at?: string
          on_hand: number
          product_id: number
          reorder_level: number
          updated_at?: string
        }
        Update: {
          id?: number
          notified_at?: string
          on_hand?: number
          product_id?: number
          reorder_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          avg_cost: number
          created_at: string
          id: number
          name: string
          reorder_level: number
          sku: string
          type: string
          updated_at: string
        }
        Insert: {
          avg_cost?: number
          created_at?: string
          id?: number
          name: string
          reorder_level?: number
          sku: string
          type: string
          updated_at?: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          id?: number
          name?: string
          reorder_level?: number
          sku?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_purchase_order_lines: {
        Row: {
          created_at: string
          duty_alloc: number
          freight_alloc: number
          id: number
          landed_unit_cost: number
          other_alloc: number
          product_id: number
          purchase_order_id: number
          qty: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duty_alloc?: number
          freight_alloc?: number
          id?: number
          landed_unit_cost?: number
          other_alloc?: number
          product_id: number
          purchase_order_id: number
          qty: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duty_alloc?: number
          freight_alloc?: number
          id?: number
          landed_unit_cost?: number
          other_alloc?: number
          product_id?: number
          purchase_order_id?: number
          qty?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "inventory_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_purchase_orders: {
        Row: {
          created_at: string
          date: string
          freight_in: number
          id: number
          import_duty: number
          other_charges: number
          updated_at: string
          vendor: string
        }
        Insert: {
          created_at?: string
          date?: string
          freight_in?: number
          id?: number
          import_duty?: number
          other_charges?: number
          updated_at?: string
          vendor: string
        }
        Update: {
          created_at?: string
          date?: string
          freight_in?: number
          id?: number
          import_duty?: number
          other_charges?: number
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      inventory_sales_order_lines: {
        Row: {
          created_at: string
          description: string | null
          id: number
          product_id: number
          qty: number
          sales_order_id: number
          unit_price_override: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          product_id: number
          qty: number
          sales_order_id: number
          unit_price_override: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          product_id?: number
          qty?: number
          sales_order_id?: number
          unit_price_override?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_base_valuation"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_kit_capacity"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_on_hand"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products_with_cost"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "gift_order_summary"
            referencedColumns: ["gift_id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "inventory_sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sales_orders: {
        Row: {
          comments: string | null
          created_at: string
          customer: string
          date: string
          id: number
          is_gift: boolean
          shipping_cost: number
          total_cogs: number
          total_price: number
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          customer: string
          date?: string
          id?: number
          is_gift?: boolean
          shipping_cost?: number
          total_cogs?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          customer?: string
          date?: string
          id?: number
          is_gift?: boolean
          shipping_cost?: number
          total_cogs?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
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
          is_admin: boolean
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          current_city?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          current_city?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
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
          image: string | null
          location: string
          max_participants: number | null
          name: string
          open_play: boolean
          payment_link: string | null
          points_value: number
          prize: string | null
          registration_fee: string | null
          start_at: string | null
          time: string
        }
        Insert: {
          date: string
          date_actual?: string | null
          description: string
          id: string
          image?: string | null
          location: string
          max_participants?: number | null
          name: string
          open_play?: boolean
          payment_link?: string | null
          points_value?: number
          prize?: string | null
          registration_fee?: string | null
          start_at?: string | null
          time: string
        }
        Update: {
          date?: string
          date_actual?: string | null
          description?: string
          id?: string
          image?: string | null
          location?: string
          max_participants?: number | null
          name?: string
          open_play?: boolean
          payment_link?: string | null
          points_value?: number
          prize?: string | null
          registration_fee?: string | null
          start_at?: string | null
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
      gift_cost_summary: {
        Row: {
          total_gift_cogs: number | null
          total_gift_costs: number | null
          total_gift_shipping: number | null
        }
        Relationships: []
      }
      gift_order_summary: {
        Row: {
          comments: string | null
          customer: string | null
          date: string | null
          face_value: number | null
          gift_id: number | null
          items_given: number | null
        }
        Relationships: []
      }
      inventory_base_valuation: {
        Row: {
          avg_cost: number | null
          inventory_value: number | null
          name: string | null
          on_hand: number | null
          product_id: number | null
          sku: string | null
        }
        Relationships: []
      }
      inventory_kit_capacity: {
        Row: {
          kit_id: number | null
          kit_inventory_value: number | null
          kit_name: string | null
          kit_sku: string | null
          possible_kits: number | null
          unit_cost: number | null
        }
        Relationships: []
      }
      inventory_on_hand: {
        Row: {
          avg_cost: number | null
          name: string | null
          on_hand: number | null
          product_id: number | null
          reorder_level: number | null
          sku: string | null
        }
        Relationships: []
      }
      inventory_products_with_cost: {
        Row: {
          avg_cost: number | null
          computed_cost: number | null
          created_at: string | null
          id: number | null
          name: string | null
          reorder_level: number | null
          sku: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          avg_cost: number | null
          name: string | null
          on_hand: number | null
          product_id: number | null
          reorder_level: number | null
          sku: string | null
        }
        Relationships: []
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
      sales_order_summary: {
        Row: {
          comments: string | null
          customer: string | null
          date: string | null
          gross_margin_pct: number | null
          gross_profit: number | null
          id: number | null
          is_gift: boolean | null
          shipping_expense: number | null
          total_cogs: number | null
          total_revenue: number | null
          units_sold: number | null
        }
        Relationships: []
      }
      tournament_with_counts: {
        Row: {
          current_participants: number | null
          date: string | null
          date_actual: string | null
          description: string | null
          id: string | null
          image: string | null
          location: string | null
          max_participants: number | null
          name: string | null
          open_play: boolean | null
          payment_link: string | null
          points_value: number | null
          prize: string | null
          registration_fee: string | null
          start_at: string | null
          time: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_pass_and_register: {
        Args: { pass_id: string; tournament_id: string; user_id: string }
        Returns: undefined
      }
      get_kpi_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          cogs: number
          gross_margin: number
          net_margin_including_gifts: number
          revenue: number
          shipping_expense: number
          total_gift_cogs: number
          total_gift_shipping: number
        }[]
      }
      get_match_details_by_tournament: {
        Args: { p_tournament_id: string }
        Returns: {
          match_id: string
          player1_name: string
          player1_seed: number
          player1_slug: string
          player2_name: string
          player2_seed: number
          player2_slug: string
          round: string
          sets: Json
          winner_slug: string
        }[]
      }
      get_tournament_summary: {
        Args: { p_tournament_id: string }
        Returns: {
          runner_up: string
          score: string
          winner: string
        }[]
      }
      record_purchase_receipt: {
        Args: { po_id: number }
        Returns: undefined
      }
      record_sale: {
        Args: { sale_id: number }
        Returns: undefined
      }
      register_for_tournament: {
        Args: { p_pass_id: string; p_tournament_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
