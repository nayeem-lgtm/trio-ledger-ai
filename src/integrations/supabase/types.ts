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
      brand_kits: {
        Row: {
          accent_color: string | null
          body_font: string | null
          brand_color: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_tax_id: string | null
          company_website: string | null
          created_at: string
          default_email_body: string | null
          default_email_subject: string | null
          default_notes: string | null
          default_terms: string | null
          footer_text: string | null
          heading_font: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          muted_color: string | null
          name: string
          page_size: string | null
          signature_url: string | null
          tagline: string | null
          text_color: string | null
          updated_at: string
          user_id: string
          watermark_text: string | null
        }
        Insert: {
          accent_color?: string | null
          body_font?: string | null
          brand_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          created_at?: string
          default_email_body?: string | null
          default_email_subject?: string | null
          default_notes?: string | null
          default_terms?: string | null
          footer_text?: string | null
          heading_font?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          muted_color?: string | null
          name?: string
          page_size?: string | null
          signature_url?: string | null
          tagline?: string | null
          text_color?: string | null
          updated_at?: string
          user_id: string
          watermark_text?: string | null
        }
        Update: {
          accent_color?: string | null
          body_font?: string | null
          brand_color?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          created_at?: string
          default_email_body?: string | null
          default_email_subject?: string | null
          default_notes?: string | null
          default_terms?: string | null
          footer_text?: string | null
          heading_font?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          muted_color?: string | null
          name?: string
          page_size?: string | null
          signature_url?: string | null
          tagline?: string | null
          text_color?: string | null
          updated_at?: string
          user_id?: string
          watermark_text?: string | null
        }
        Relationships: []
      }
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
      insurance_agent_daily: {
        Row: {
          agent: string | null
          created_at: string
          entry_date: string | null
          extra: Json
          id: string
          manager_notes: string | null
          manager_score: number | null
          owner_id: string
          shift_hours: number | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          agent?: string | null
          created_at?: string
          entry_date?: string | null
          extra?: Json
          id?: string
          manager_notes?: string | null
          manager_score?: number | null
          owner_id: string
          shift_hours?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          agent?: string | null
          created_at?: string
          entry_date?: string | null
          extra?: Json
          id?: string
          manager_notes?: string | null
          manager_score?: number | null
          owner_id?: string
          shift_hours?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      insurance_agents: {
        Row: {
          calltools_seat_cost: number | null
          created_at: string
          extra: Json
          hourly_rate: number | null
          id: string
          licensed_states: string | null
          name: string
          notes: string | null
          owner_id: string
          primary_carrier: string | null
          product_focus: string | null
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          calltools_seat_cost?: number | null
          created_at?: string
          extra?: Json
          hourly_rate?: number | null
          id?: string
          licensed_states?: string | null
          name: string
          notes?: string | null
          owner_id: string
          primary_carrier?: string | null
          product_focus?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          calltools_seat_cost?: number | null
          created_at?: string
          extra?: Json
          hourly_rate?: number | null
          id?: string
          licensed_states?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          primary_carrier?: string | null
          product_focus?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_calltools: {
        Row: {
          agent: string | null
          busy_call_back_later: number | null
          call_back_scheduled: number | null
          created_at: string
          customer_hang_up: number | null
          entry_date: string | null
          extra: Json
          goal_disposition: number | null
          id: string
          no_contact: number | null
          not_interested: number | null
          notes: string | null
          owner_id: string
          total_dispositions: number | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          agent?: string | null
          busy_call_back_later?: number | null
          call_back_scheduled?: number | null
          created_at?: string
          customer_hang_up?: number | null
          entry_date?: string | null
          extra?: Json
          goal_disposition?: number | null
          id?: string
          no_contact?: number | null
          not_interested?: number | null
          notes?: string | null
          owner_id: string
          total_dispositions?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          agent?: string | null
          busy_call_back_later?: number | null
          call_back_scheduled?: number | null
          created_at?: string
          customer_hang_up?: number | null
          entry_date?: string | null
          extra?: Json
          goal_disposition?: number | null
          id?: string
          no_contact?: number | null
          not_interested?: number | null
          notes?: string | null
          owner_id?: string
          total_dispositions?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      insurance_commission_tiers: {
        Row: {
          commission_per_sale: number | null
          created_at: string
          extra: Json
          id: string
          max_sales: number | null
          min_sales: number | null
          notes: string | null
          owner_id: string
          tier_name: string | null
          updated_at: string
        }
        Insert: {
          commission_per_sale?: number | null
          created_at?: string
          extra?: Json
          id?: string
          max_sales?: number | null
          min_sales?: number | null
          notes?: string | null
          owner_id: string
          tier_name?: string | null
          updated_at?: string
        }
        Update: {
          commission_per_sale?: number | null
          created_at?: string
          extra?: Json
          id?: string
          max_sales?: number | null
          min_sales?: number | null
          notes?: string | null
          owner_id?: string
          tier_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_custom_columns: {
        Row: {
          col_key: string
          col_type: string
          created_at: string
          id: string
          label: string
          owner_id: string
          position: number
          sheet_key: string
          updated_at: string
        }
        Insert: {
          col_key: string
          col_type?: string
          created_at?: string
          id?: string
          label: string
          owner_id: string
          position?: number
          sheet_key: string
          updated_at?: string
        }
        Update: {
          col_key?: string
          col_type?: string
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          position?: number
          sheet_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_paid_qa: {
        Row: {
          agent: string | null
          callback_needed: boolean | null
          caller_id: string | null
          created_at: string
          customer_name: string | null
          duration: string | null
          entry_date: string | null
          extra: Json
          follow_up_owner: string | null
          id: string
          loss_reason: string | null
          notes: string | null
          owner_id: string
          paid_call_cost: number | null
          payment_method_seen: string | null
          policy_number: string | null
          policy_start_date: string | null
          qa_status: string | null
          ringba_target: string | null
          sale_outcome: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          agent?: string | null
          callback_needed?: boolean | null
          caller_id?: string | null
          created_at?: string
          customer_name?: string | null
          duration?: string | null
          entry_date?: string | null
          extra?: Json
          follow_up_owner?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          owner_id: string
          paid_call_cost?: number | null
          payment_method_seen?: string | null
          policy_number?: string | null
          policy_start_date?: string | null
          qa_status?: string | null
          ringba_target?: string | null
          sale_outcome?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          agent?: string | null
          callback_needed?: boolean | null
          caller_id?: string | null
          created_at?: string
          customer_name?: string | null
          duration?: string | null
          entry_date?: string | null
          extra?: Json
          follow_up_owner?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          owner_id?: string
          paid_call_cost?: number | null
          payment_method_seen?: string | null
          policy_number?: string | null
          policy_start_date?: string | null
          qa_status?: string | null
          ringba_target?: string | null
          sale_outcome?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insurance_payables: {
        Row: {
          amount: number | null
          cost_category: string | null
          cost_date: string | null
          created_at: string
          due_date: string | null
          extra: Json
          id: string
          month: string | null
          notes: string | null
          owner_id: string
          paid_date: string | null
          payment_status: string | null
          related_week: string | null
          updated_at: string
          vendor_agent: string | null
          week_start: string | null
        }
        Insert: {
          amount?: number | null
          cost_category?: string | null
          cost_date?: string | null
          created_at?: string
          due_date?: string | null
          extra?: Json
          id?: string
          month?: string | null
          notes?: string | null
          owner_id: string
          paid_date?: string | null
          payment_status?: string | null
          related_week?: string | null
          updated_at?: string
          vendor_agent?: string | null
          week_start?: string | null
        }
        Update: {
          amount?: number | null
          cost_category?: string | null
          cost_date?: string | null
          created_at?: string
          due_date?: string | null
          extra?: Json
          id?: string
          month?: string | null
          notes?: string | null
          owner_id?: string
          paid_date?: string | null
          payment_status?: string | null
          related_week?: string | null
          updated_at?: string
          vendor_agent?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      insurance_payroll: {
        Row: {
          agent: string | null
          base_paid_date: string | null
          base_pay_status: string | null
          base_payroll_due: number | null
          calltools_weekly_cost: number | null
          carrier_revenue_received: number | null
          commission_per_sale: number | null
          created_at: string
          end_month_agent_payable: number | null
          extra: Json
          hourly_rate: number | null
          id: string
          net_cash_position: number | null
          notes: string | null
          other_cost: number | null
          owner_id: string
          paid_calls: number | null
          paid_hours: number | null
          personal_lead_incentive: number | null
          premium_written: number | null
          ringba_cost: number | null
          ringba_sales: number | null
          sales_commission: number | null
          total_agent_pay: number | null
          total_company_cost: number | null
          total_sales: number | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          agent?: string | null
          base_paid_date?: string | null
          base_pay_status?: string | null
          base_payroll_due?: number | null
          calltools_weekly_cost?: number | null
          carrier_revenue_received?: number | null
          commission_per_sale?: number | null
          created_at?: string
          end_month_agent_payable?: number | null
          extra?: Json
          hourly_rate?: number | null
          id?: string
          net_cash_position?: number | null
          notes?: string | null
          other_cost?: number | null
          owner_id: string
          paid_calls?: number | null
          paid_hours?: number | null
          personal_lead_incentive?: number | null
          premium_written?: number | null
          ringba_cost?: number | null
          ringba_sales?: number | null
          sales_commission?: number | null
          total_agent_pay?: number | null
          total_company_cost?: number | null
          total_sales?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          agent?: string | null
          base_paid_date?: string | null
          base_pay_status?: string | null
          base_payroll_due?: number | null
          calltools_weekly_cost?: number | null
          carrier_revenue_received?: number | null
          commission_per_sale?: number | null
          created_at?: string
          end_month_agent_payable?: number | null
          extra?: Json
          hourly_rate?: number | null
          id?: string
          net_cash_position?: number | null
          notes?: string | null
          other_cost?: number | null
          owner_id?: string
          paid_calls?: number | null
          paid_hours?: number | null
          personal_lead_incentive?: number | null
          premium_written?: number | null
          ringba_cost?: number | null
          ringba_sales?: number | null
          sales_commission?: number | null
          total_agent_pay?: number | null
          total_company_cost?: number | null
          total_sales?: number | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      insurance_ringba: {
        Row: {
          acl: number | null
          agent: string | null
          calltools_source: string | null
          completed: number | null
          connected: number | null
          cost_per_sale: number | null
          cost_to_ray: number | null
          created_at: string
          ct_busy_call_back_later: number | null
          ct_call_back_scheduled: number | null
          ct_customer_hang_up: number | null
          ct_dnc: number | null
          ct_inbound_calls: number | null
          ct_no_contact: number | null
          ct_not_interested: number | null
          ct_outbound_calls: number | null
          ct_phone_hours: number | null
          ct_sale_made: number | null
          ct_total_calls: number | null
          ct_total_dispositions: number | null
          ended: number | null
          entry_date: string | null
          extra: Json
          id: string
          incoming: number | null
          manager_notes: string | null
          notes: string | null
          owner_id: string
          paid_calls: number | null
          paid_hours: number | null
          paid_out_pct: number | null
          ringba_cost_status: string | null
          ringba_sales: number | null
          ringba_target: string | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          acl?: number | null
          agent?: string | null
          calltools_source?: string | null
          completed?: number | null
          connected?: number | null
          cost_per_sale?: number | null
          cost_to_ray?: number | null
          created_at?: string
          ct_busy_call_back_later?: number | null
          ct_call_back_scheduled?: number | null
          ct_customer_hang_up?: number | null
          ct_dnc?: number | null
          ct_inbound_calls?: number | null
          ct_no_contact?: number | null
          ct_not_interested?: number | null
          ct_outbound_calls?: number | null
          ct_phone_hours?: number | null
          ct_sale_made?: number | null
          ct_total_calls?: number | null
          ct_total_dispositions?: number | null
          ended?: number | null
          entry_date?: string | null
          extra?: Json
          id?: string
          incoming?: number | null
          manager_notes?: string | null
          notes?: string | null
          owner_id: string
          paid_calls?: number | null
          paid_hours?: number | null
          paid_out_pct?: number | null
          ringba_cost_status?: string | null
          ringba_sales?: number | null
          ringba_target?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          acl?: number | null
          agent?: string | null
          calltools_source?: string | null
          completed?: number | null
          connected?: number | null
          cost_per_sale?: number | null
          cost_to_ray?: number | null
          created_at?: string
          ct_busy_call_back_later?: number | null
          ct_call_back_scheduled?: number | null
          ct_customer_hang_up?: number | null
          ct_dnc?: number | null
          ct_inbound_calls?: number | null
          ct_no_contact?: number | null
          ct_not_interested?: number | null
          ct_outbound_calls?: number | null
          ct_phone_hours?: number | null
          ct_sale_made?: number | null
          ct_total_calls?: number | null
          ct_total_dispositions?: number | null
          ended?: number | null
          entry_date?: string | null
          extra?: Json
          id?: string
          incoming?: number | null
          manager_notes?: string | null
          notes?: string | null
          owner_id?: string
          paid_calls?: number | null
          paid_hours?: number | null
          paid_out_pct?: number | null
          ringba_cost_status?: string | null
          ringba_sales?: number | null
          ringba_target?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      insurance_sales: {
        Row: {
          agent: string | null
          callback_converted: boolean | null
          carrier: string | null
          carrier_revenue_received: boolean | null
          carrier_revenue_received_amount: number | null
          commission_eligible: boolean | null
          count_sale: boolean | null
          created_at: string
          customer_name: string | null
          extra: Json
          id: string
          monthly_premium: number | null
          notes: string | null
          owner_id: string
          payment_method: string | null
          payment_risk: string | null
          payment_status: string | null
          personal_lead_incentive: number | null
          phone_number: string | null
          policy_amount: number | null
          policy_number: string | null
          policy_start_date: string | null
          premium_draft_date: string | null
          product: string | null
          publisher: string | null
          qa_status: string | null
          revenue_received_date: string | null
          ringba_target: string | null
          sale_date: string | null
          sale_status: string | null
          source: string | null
          state: string | null
          updated_at: string
          week_start: string | null
        }
        Insert: {
          agent?: string | null
          callback_converted?: boolean | null
          carrier?: string | null
          carrier_revenue_received?: boolean | null
          carrier_revenue_received_amount?: number | null
          commission_eligible?: boolean | null
          count_sale?: boolean | null
          created_at?: string
          customer_name?: string | null
          extra?: Json
          id?: string
          monthly_premium?: number | null
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          payment_risk?: string | null
          payment_status?: string | null
          personal_lead_incentive?: number | null
          phone_number?: string | null
          policy_amount?: number | null
          policy_number?: string | null
          policy_start_date?: string | null
          premium_draft_date?: string | null
          product?: string | null
          publisher?: string | null
          qa_status?: string | null
          revenue_received_date?: string | null
          ringba_target?: string | null
          sale_date?: string | null
          sale_status?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Update: {
          agent?: string | null
          callback_converted?: boolean | null
          carrier?: string | null
          carrier_revenue_received?: boolean | null
          carrier_revenue_received_amount?: number | null
          commission_eligible?: boolean | null
          count_sale?: boolean | null
          created_at?: string
          customer_name?: string | null
          extra?: Json
          id?: string
          monthly_premium?: number | null
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          payment_risk?: string | null
          payment_status?: string | null
          personal_lead_incentive?: number | null
          phone_number?: string | null
          policy_amount?: number | null
          policy_number?: string | null
          policy_start_date?: string | null
          premium_draft_date?: string | null
          product?: string | null
          publisher?: string | null
          qa_status?: string | null
          revenue_received_date?: string | null
          ringba_target?: string | null
          sale_date?: string | null
          sale_status?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          week_start?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_discount: number
          item_tax_rate: number
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
          item_discount?: number
          item_tax_rate?: number
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
          item_discount?: number
          item_tax_rate?: number
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
          bcc_emails: string[]
          blocks: Json
          brand_kit_id: string | null
          business_id: string | null
          buyer_id: string | null
          cc_emails: string[]
          created_at: string
          currency: string
          custom_fields: Json
          discount: number
          due_date: string | null
          email_body: string | null
          email_subject: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_link: string | null
          po_number: string | null
          project_code: string | null
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
          bcc_emails?: string[]
          blocks?: Json
          brand_kit_id?: string | null
          business_id?: string | null
          buyer_id?: string | null
          cc_emails?: string[]
          created_at?: string
          currency?: string
          custom_fields?: Json
          discount?: number
          due_date?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          po_number?: string | null
          project_code?: string | null
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
          bcc_emails?: string[]
          blocks?: Json
          brand_kit_id?: string | null
          business_id?: string | null
          buyer_id?: string | null
          cc_emails?: string[]
          created_at?: string
          currency?: string
          custom_fields?: Json
          discount?: number
          due_date?: string | null
          email_body?: string | null
          email_subject?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_link?: string | null
          po_number?: string | null
          project_code?: string | null
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
            foreignKeyName: "invoices_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
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
