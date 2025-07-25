export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      checkin_sessions: {
        Row: {
          allocated_guests: number[] | null
          booking_comments: Json | null
          checked_in_guests: number[] | null
          created_at: string
          friendship_groups: Json | null
          guest_list_id: string
          guest_table_allocations: Json | null
          id: string
          pager_assignments: Json | null
          party_groups: Json | null
          seated_guests: number[] | null
          seated_sections: string[] | null
          session_date: string
          updated_at: string
          user_id: string
          walk_in_guests: Json | null
        }
        Insert: {
          allocated_guests?: number[] | null
          booking_comments?: Json | null
          checked_in_guests?: number[] | null
          created_at?: string
          friendship_groups?: Json | null
          guest_list_id: string
          guest_table_allocations?: Json | null
          id?: string
          pager_assignments?: Json | null
          party_groups?: Json | null
          seated_guests?: number[] | null
          seated_sections?: string[] | null
          session_date?: string
          updated_at?: string
          user_id: string
          walk_in_guests?: Json | null
        }
        Update: {
          allocated_guests?: number[] | null
          booking_comments?: Json | null
          checked_in_guests?: number[] | null
          created_at?: string
          friendship_groups?: Json | null
          guest_list_id?: string
          guest_table_allocations?: Json | null
          id?: string
          pager_assignments?: Json | null
          party_groups?: Json | null
          seated_guests?: number[] | null
          seated_sections?: string[] | null
          session_date?: string
          updated_at?: string
          user_id?: string
          walk_in_guests?: Json | null
        }
        Relationships: []
      }
      guest_lists: {
        Row: {
          event_date: string | null
          id: string
          is_active: boolean | null
          name: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          booker_name: string | null
          booking_code: string | null
          booking_comments: string | null
          checked_in_at: string | null
          diet_info: string | null
          guest_list_id: string
          id: string
          interval_drinks_order: boolean | null
          interval_pizza_order: boolean | null
          is_allocated: boolean | null
          is_checked_in: boolean | null
          is_seated: boolean | null
          item_details: string | null
          magic_info: string | null
          manual_override: boolean | null
          notes: string | null
          order_last_updated_at: string | null
          order_last_updated_by: string | null
          original_row_index: number | null
          pager_number: number | null
          seated_at: string | null
          show_time: string | null
          staff_updated_order: string | null
          table_assignments: number[] | null
          ticket_data: Json | null
          total_quantity: number | null
        }
        Insert: {
          booker_name?: string | null
          booking_code?: string | null
          booking_comments?: string | null
          checked_in_at?: string | null
          diet_info?: string | null
          guest_list_id: string
          id?: string
          interval_drinks_order?: boolean | null
          interval_pizza_order?: boolean | null
          is_allocated?: boolean | null
          is_checked_in?: boolean | null
          is_seated?: boolean | null
          item_details?: string | null
          magic_info?: string | null
          manual_override?: boolean | null
          notes?: string | null
          order_last_updated_at?: string | null
          order_last_updated_by?: string | null
          original_row_index?: number | null
          pager_number?: number | null
          seated_at?: string | null
          show_time?: string | null
          staff_updated_order?: string | null
          table_assignments?: number[] | null
          ticket_data?: Json | null
          total_quantity?: number | null
        }
        Update: {
          booker_name?: string | null
          booking_code?: string | null
          booking_comments?: string | null
          checked_in_at?: string | null
          diet_info?: string | null
          guest_list_id?: string
          id?: string
          interval_drinks_order?: boolean | null
          interval_pizza_order?: boolean | null
          is_allocated?: boolean | null
          is_checked_in?: boolean | null
          is_seated?: boolean | null
          item_details?: string | null
          magic_info?: string | null
          manual_override?: boolean | null
          notes?: string | null
          order_last_updated_at?: string | null
          order_last_updated_by?: string | null
          original_row_index?: number | null
          pager_number?: number | null
          seated_at?: string | null
          show_time?: string | null
          staff_updated_order?: string | null
          table_assignments?: number[] | null
          ticket_data?: Json | null
          total_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_guest_list_id_fkey"
            columns: ["guest_list_id"]
            isOneToOne: false
            referencedRelation: "guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          username?: string
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
  public: {
    Enums: {},
  },
} as const
