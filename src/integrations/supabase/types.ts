export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      guest_lists: {
        Row: {
          id: string
          is_active: boolean | null
          name: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
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
          guest_list_id: string
          id: string
          interval_drinks_order: boolean | null
          interval_pizza_order: boolean | null
          is_allocated: boolean | null
          is_checked_in: boolean | null
          is_seated: boolean | null
          item_details: string | null
          notes: string | null
          original_row_index: number | null
          pager_number: number | null
          seated_at: string | null
          show_time: string | null
          table_assignments: number[] | null
          ticket_data: Json | null
          total_quantity: number | null
        }
        Insert: {
          booker_name?: string | null
          booking_code?: string | null
          booking_comments?: string | null
          checked_in_at?: string | null
          guest_list_id: string
          id?: string
          interval_drinks_order?: boolean | null
          interval_pizza_order?: boolean | null
          is_allocated?: boolean | null
          is_checked_in?: boolean | null
          is_seated?: boolean | null
          item_details?: string | null
          notes?: string | null
          original_row_index?: number | null
          pager_number?: number | null
          seated_at?: string | null
          show_time?: string | null
          table_assignments?: number[] | null
          ticket_data?: Json | null
          total_quantity?: number | null
        }
        Update: {
          booker_name?: string | null
          booking_code?: string | null
          booking_comments?: string | null
          checked_in_at?: string | null
          guest_list_id?: string
          id?: string
          interval_drinks_order?: boolean | null
          interval_pizza_order?: boolean | null
          is_allocated?: boolean | null
          is_checked_in?: boolean | null
          is_seated?: boolean | null
          item_details?: string | null
          notes?: string | null
          original_row_index?: number | null
          pager_number?: number | null
          seated_at?: string | null
          show_time?: string | null
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
