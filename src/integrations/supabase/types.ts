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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      buyer_receipts: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          expected_date: string | null
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          received_date: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          received_date?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          received_date?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_receipts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          currency: string
          custom_days: number | null
          default_business_id: string | null
          default_category_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: Database["public"]["Enums"]["payment_term"]
          phone: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          currency?: string
          custom_days?: number | null
          default_business_id?: string | null
          default_category_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_term"]
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          currency?: string
          custom_days?: number | null
          default_business_id?: string | null
          default_category_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_term"]
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_default_business_id_fkey"
            columns: ["default_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyers_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_id: string | null
          color: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          business_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          business_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          service_end: string | null
          service_start: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          service_end?: string | null
          service_start?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          service_end?: string | null
          service_start?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bank_details: Json | null
          business_id: string | null
          buyer_id: string | null
          created_at: string
          currency: string
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_link: string | null
          receiver: Json | null
          sender: Json | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          template: string
          terms: string | null
          total: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: Json | null
          business_id?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          receiver?: Json | null
          sender?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          template?: string
          terms?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: Json | null
          business_id?: string | null
          buyer_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          receiver?: Json | null
          sender?: Json | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          template?: string
          terms?: string | null
          total?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      publisher_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          period_end: string | null
          period_start: string | null
          publisher_id: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          publisher_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          period_end?: string | null
          period_start?: string | null
          publisher_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publisher_payments_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "publishers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publisher_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      publishers: {
        Row: {
          bank_details: Json | null
          company: string | null
          created_at: string
          currency: string
          custom_days: number | null
          default_amount: number | null
          default_business_id: string | null
          default_category_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: Database["public"]["Enums"]["payment_term"]
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: Json | null
          company?: string | null
          created_at?: string
          currency?: string
          custom_days?: number | null
          default_amount?: number | null
          default_business_id?: string | null
          default_category_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_term"]
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: Json | null
          company?: string | null
          created_at?: string
          currency?: string
          custom_days?: number | null
          default_amount?: number | null
          default_business_id?: string | null
          default_category_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: Database["public"]["Enums"]["payment_term"]
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishers_default_business_id_fkey"
            columns: ["default_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publishers_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string | null
          host: string
          password: string
          port: number
          reply_to: string | null
          secure: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string | null
          host: string
          password: string
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string | null
          host?: string
          password?: string
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          owner_id: string
          role: Database["public"]["Enums"]["team_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          owner_id: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          member_user_id: string
          owner_id: string
          role: Database["public"]["Enums"]["team_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_user_id: string
          owner_id: string
          role?: Database["public"]["Enums"]["team_role"]
        }
        Update: {
          created_at?: string
          id?: string
          member_user_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["team_role"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          type?: Database["public"]["Enums"]["txn_type"]
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_settings: {
        Row: {
          created_at: string
          gemini_api_key: string | null
          gemini_model: string | null
          openai_api_key: string | null
          openai_model: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gemini_api_key?: string | null
          gemini_model?: string | null
          openai_api_key?: string | null
          openai_model?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gemini_api_key?: string | null
          gemini_model?: string | null
          openai_api_key?: string | null
          openai_model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_my_pending_invites: { Args: never; Returns: number }
      can_admin_workspace: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      can_write_workspace: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_term:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "custom"
        | "on_receipt"
      team_role: "admin" | "editor" | "viewer"
      txn_type: "income" | "expense"
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
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      payment_term: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "custom",
        "on_receipt",
      ],
      team_role: ["admin", "editor", "viewer"],
      txn_type: ["income", "expense"],
    },
  },
} as const
