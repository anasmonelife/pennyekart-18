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
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string | null
          full_name: string
          handled_at: string | null
          handled_by: string | null
          id: string
          mobile: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          mobile: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          mobile?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          category_type: string
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          item_count: string | null
          margin_percentage: number | null
          name: string
          sort_order: number
          updated_at: string
          variation_type: string | null
        }
        Insert: {
          category_type?: string
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_count?: string | null
          margin_percentage?: number | null
          name: string
          sort_order?: number
          updated_at?: string
          variation_type?: string | null
        }
        Update: {
          category_type?: string
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_count?: string | null
          margin_percentage?: number | null
          name?: string
          sort_order?: number
          updated_at?: string
          variation_type?: string | null
        }
        Relationships: []
      }
      chatbot_api_keys: {
        Row: {
          api_key: string
          base_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
        }
        Insert: {
          api_key: string
          base_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          service_name: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          base_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          service_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_audit_log: {
        Row: {
          arguments: Json
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          result: Json | null
          status: string
          tool_name: string
          user_id: string | null
        }
        Insert: {
          arguments?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
          tool_name: string
          user_id?: string | null
        }
        Update: {
          arguments?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chatbot_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      chatbot_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      commission_allocation_snapshots: {
        Row: {
          blocked_tables: string[]
          created_at: string
          created_by: string | null
          id: string
          people: Json
          period_from: string | null
          period_key: string
          period_to: string | null
          total_commission: number
          total_profit: number
          updated_at: string
        }
        Insert: {
          blocked_tables?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          people?: Json
          period_from?: string | null
          period_key: string
          period_to?: string | null
          total_commission?: number
          total_profit?: number
          updated_at?: string
        }
        Update: {
          blocked_tables?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          people?: Json
          period_from?: string | null
          period_key?: string
          period_to?: string | null
          total_commission?: number
          total_profit?: number
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          created_at: string
          creator_user_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_user_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_user_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_access_requests: {
        Row: {
          admin_notes: string | null
          community_name: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          community_name: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          community_name?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_commission_allocations: {
        Row: {
          allocated_at: string | null
          allocated_by: string | null
          amount: number
          calculated_commission: number
          commission_rate: number
          community_id: string
          community_name: string
          created_at: string
          customer_user_id: string | null
          elife_person_id: string | null
          id: string
          period_from: string
          period_to: string
          recipient_mobile: string | null
          recipient_name: string | null
          recipient_type: string
          share_count: number
          status: string
          total_profit: number
          updated_at: string
          verified_at: string | null
          wallet_transaction_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          allocated_by?: string | null
          amount: number
          calculated_commission: number
          commission_rate: number
          community_id: string
          community_name: string
          created_at?: string
          customer_user_id?: string | null
          elife_person_id?: string | null
          id?: string
          period_from: string
          period_to: string
          recipient_mobile?: string | null
          recipient_name?: string | null
          recipient_type?: string
          share_count?: number
          status?: string
          total_profit: number
          updated_at?: string
          verified_at?: string | null
          wallet_transaction_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          allocated_by?: string | null
          amount?: number
          calculated_commission?: number
          commission_rate?: number
          community_id?: string
          community_name?: string
          created_at?: string
          customer_user_id?: string | null
          elife_person_id?: string | null
          id?: string
          period_from?: string
          period_to?: string
          recipient_mobile?: string | null
          recipient_name?: string | null
          recipient_type?: string
          share_count?: number
          status?: string
          total_profit?: number
          updated_at?: string
          verified_at?: string | null
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_commission_allocations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_commission_allocations_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "customer_wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invites: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          id: string
          invited_mobile: string
          invited_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          id?: string
          invited_mobile: string
          invited_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          invited_mobile?: string
          invited_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
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
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          latitude: number | null
          local_body_id: string | null
          longitude: number | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
          ward_number: number | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          local_body_id?: string | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          ward_number?: number | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          latitude?: number | null
          local_body_id?: string | null
          longitude?: number | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_search_history: {
        Row: {
          created_at: string
          customer_user_id: string
          id: string
          result_count: number | null
          search_query: string
        }
        Insert: {
          created_at?: string
          customer_user_id: string
          id?: string
          result_count?: number | null
          search_query: string
        }
        Update: {
          created_at?: string
          customer_user_id?: string
          id?: string
          result_count?: number | null
          search_query?: string
        }
        Relationships: []
      }
      customer_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_user_id: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_user_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_user_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "customer_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wallets: {
        Row: {
          balance: number
          created_at: string
          customer_user_id: string
          id: string
          min_usage_amount: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_user_id: string
          id?: string
          min_usage_amount?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_user_id?: string
          id?: string
          min_usage_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_charge_rules: {
        Row: {
          category_name: string | null
          charge_amount: number
          created_at: string
          godown_id: string | null
          id: string
          is_active: boolean
          min_purchase_amount: number | null
          name: string
          priority: number
          rule_type: string
          time_slot_end: string | null
          time_slot_label: string | null
          time_slot_start: string | null
          updated_at: string
        }
        Insert: {
          category_name?: string | null
          charge_amount?: number
          created_at?: string
          godown_id?: string | null
          id?: string
          is_active?: boolean
          min_purchase_amount?: number | null
          name: string
          priority?: number
          rule_type: string
          time_slot_end?: string | null
          time_slot_label?: string | null
          time_slot_start?: string | null
          updated_at?: string
        }
        Update: {
          category_name?: string | null
          charge_amount?: number
          created_at?: string
          godown_id?: string | null
          id?: string
          is_active?: boolean
          min_purchase_amount?: number | null
          name?: string
          priority?: number
          rule_type?: string
          time_slot_end?: string | null
          time_slot_label?: string | null
          time_slot_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_charge_rules_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_staff_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          staff_user_id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          staff_user_id: string
          type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          staff_user_id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_staff_wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_staff_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "delivery_staff_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_staff_wallets: {
        Row: {
          balance: number
          created_at: string
          earning_balance: number
          id: string
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          earning_balance?: number
          id?: string
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          earning_balance?: number
          id?: string
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_staff_ward_assignments: {
        Row: {
          created_at: string
          id: string
          local_body_id: string
          staff_user_id: string
          ward_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          local_body_id: string
          staff_user_id: string
          ward_number: number
        }
        Update: {
          created_at?: string
          id?: string
          local_body_id?: string
          staff_user_id?: string
          ward_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_staff_ward_assignments_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sale_products: {
        Row: {
          created_at: string
          flash_mrp: number
          flash_price: number
          flash_sale_id: string
          id: string
          product_id: string | null
          seller_product_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          flash_mrp?: number
          flash_price?: number
          flash_sale_id: string
          id?: string
          product_id?: string | null
          seller_product_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          flash_mrp?: number
          flash_price?: number
          flash_sale_id?: string
          id?: string
          product_id?: string | null
          seller_product_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "flash_sale_products_flash_sale_id_fkey"
            columns: ["flash_sale_id"]
            isOneToOne: false
            referencedRelation: "flash_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          banner_color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      godown_local_bodies: {
        Row: {
          created_at: string
          godown_id: string
          id: string
          local_body_id: string
        }
        Insert: {
          created_at?: string
          godown_id: string
          id?: string
          local_body_id: string
        }
        Update: {
          created_at?: string
          godown_id?: string
          id?: string
          local_body_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "godown_local_bodies_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "godown_local_bodies_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      godown_stock: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          godown_id: string
          id: string
          narration: string | null
          product_id: string
          purchase_number: string | null
          purchase_price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          godown_id: string
          id?: string
          narration?: string | null
          product_id: string
          purchase_number?: string | null
          purchase_price?: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          godown_id?: string
          id?: string
          narration?: string | null
          product_id?: string
          purchase_number?: string | null
          purchase_price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "godown_stock_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "godown_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      godown_wards: {
        Row: {
          created_at: string
          godown_id: string
          id: string
          local_body_id: string
          ward_number: number
        }
        Insert: {
          created_at?: string
          godown_id: string
          id?: string
          local_body_id: string
          ward_number: number
        }
        Update: {
          created_at?: string
          godown_id?: string
          id?: string
          local_body_id?: string
          ward_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "godown_wards_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "godown_wards_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      godowns: {
        Row: {
          created_at: string
          godown_type: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          godown_type?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          godown_type?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations_districts: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          state: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          state?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations_local_bodies: {
        Row: {
          body_type: string
          created_at: string
          district_id: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          ward_count: number
        }
        Insert: {
          body_type?: string
          created_at?: string
          district_id: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          ward_count?: number
        }
        Update: {
          body_type?: string
          created_at?: string
          district_id?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          ward_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "locations_local_bodies_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "locations_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          clicked_at: string | null
          delivered_at: string
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          delivered_at?: string
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          delivered_at?: string
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          auto_dismiss_seconds: number
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_label: string | null
          link_url: string | null
          message: string
          target_audience: string
          target_local_body_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_dismiss_seconds?: number
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message: string
          target_audience?: string
          target_local_body_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_dismiss_seconds?: number
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string
          target_audience?: string
          target_local_body_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offer_flash_screens: {
        Row: {
          auto_disappear_seconds: number | null
          content_text: string | null
          created_at: string
          created_by: string | null
          gradient_from: string | null
          gradient_to: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          open_delay_seconds: number | null
          open_trigger: string | null
          sort_order: number
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_disappear_seconds?: number | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          open_delay_seconds?: number | null
          open_trigger?: string | null
          sort_order?: number
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_disappear_seconds?: number | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          open_delay_seconds?: number | null
          open_trigger?: string | null
          sort_order?: number
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          assigned_delivery_staff_id: string | null
          created_at: string
          delivery_charge: number
          delivery_contact_attempted_at: string | null
          delivery_push_sent_at: string | null
          godown_id: string | null
          id: string
          is_self_delivery: boolean
          items: Json
          seller_id: string | null
          seller_product_id: string | null
          seller_push_sent_at: string | null
          shipping_address: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_delivery_staff_id?: string | null
          created_at?: string
          delivery_charge?: number
          delivery_contact_attempted_at?: string | null
          delivery_push_sent_at?: string | null
          godown_id?: string | null
          id?: string
          is_self_delivery?: boolean
          items?: Json
          seller_id?: string | null
          seller_product_id?: string | null
          seller_push_sent_at?: string | null
          shipping_address?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_delivery_staff_id?: string | null
          created_at?: string
          delivery_charge?: number
          delivery_contact_attempted_at?: string | null
          delivery_push_sent_at?: string | null
          godown_id?: string | null
          id?: string
          is_self_delivery?: boolean
          items?: Json
          seller_id?: string | null
          seller_product_id?: string | null
          seller_push_sent_at?: string | null
          shipping_address?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      penny_prime_collabs: {
        Row: {
          agent_mobile: string
          agent_user_id: string | null
          collab_code: string
          coupon_id: string
          created_at: string
          id: string
          margin_paid_at: string | null
          margin_paid_by: string | null
          margin_status: string
        }
        Insert: {
          agent_mobile: string
          agent_user_id?: string | null
          collab_code: string
          coupon_id: string
          created_at?: string
          id?: string
          margin_paid_at?: string | null
          margin_paid_by?: string | null
          margin_status?: string
        }
        Update: {
          agent_mobile?: string
          agent_user_id?: string | null
          collab_code?: string
          coupon_id?: string
          created_at?: string
          id?: string
          margin_paid_at?: string | null
          margin_paid_by?: string | null
          margin_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "penny_prime_collabs_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "penny_prime_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      penny_prime_coupon_uses: {
        Row: {
          agent_margin_amount: number
          collab_id: string
          customer_user_id: string | null
          discount_amount: number
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          agent_margin_amount?: number
          collab_id: string
          customer_user_id?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          agent_margin_amount?: number
          collab_id?: string
          customer_user_id?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penny_prime_coupon_uses_collab_id_fkey"
            columns: ["collab_id"]
            isOneToOne: false
            referencedRelation: "penny_prime_collabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penny_prime_coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      penny_prime_coupons: {
        Row: {
          agent_margin_type: string
          agent_margin_value: number
          created_at: string
          customer_discount_type: string
          customer_discount_value: number
          id: string
          is_active: boolean
          product_id: string
          seller_code: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          agent_margin_type?: string
          agent_margin_value?: number
          created_at?: string
          customer_discount_type?: string
          customer_discount_value?: number
          id?: string
          is_active?: boolean
          product_id: string
          seller_code: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          agent_margin_type?: string
          agent_margin_value?: number
          created_at?: string
          customer_discount_type?: string
          customer_discount_value?: number
          id?: string
          is_active?: boolean
          product_id?: string
          seller_code?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          feature: string
          id: string
          name: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          feature: string
          id?: string
          name: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          feature?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_combo_items: {
        Row: {
          combo_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          combo_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          combo_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "product_combos"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combos: {
        Row: {
          combo_price: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          total_mrp: number
          updated_at: string
        }
        Insert: {
          combo_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          total_mrp?: number
          updated_at?: string
        }
        Update: {
          combo_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          total_mrp?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          mrp: number
          price: number
          price_adjustment: number
          product_id: string
          product_type: string
          sort_order: number
          stock: number
          updated_at: string
          variant_label: string
          variant_value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mrp?: number
          price?: number
          price_adjustment?: number
          product_id: string
          product_type?: string
          sort_order?: number
          stock?: number
          updated_at?: string
          variant_label: string
          variant_value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          mrp?: number
          price?: number
          price_adjustment?: number
          product_id?: string
          product_type?: string
          sort_order?: number
          stock?: number
          updated_at?: string
          variant_label?: string
          variant_value?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          coming_soon: boolean
          created_at: string
          created_by: string | null
          description: string | null
          discount_rate: number
          featured_discount_type: string
          featured_discount_value: number
          id: string
          image_url: string | null
          image_url_2: string | null
          image_url_3: string | null
          is_active: boolean
          margin_percentage: number | null
          mrp: number
          name: string
          price: number
          purchase_rate: number
          section: string | null
          stock: number
          storage_provider: string | null
          updated_at: string
          updated_by: string | null
          upload_status: string | null
          video_url: string | null
          wallet_points: number
        }
        Insert: {
          category?: string | null
          coming_soon?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_rate?: number
          featured_discount_type?: string
          featured_discount_value?: number
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_active?: boolean
          margin_percentage?: number | null
          mrp?: number
          name: string
          price?: number
          purchase_rate?: number
          section?: string | null
          stock?: number
          storage_provider?: string | null
          updated_at?: string
          updated_by?: string | null
          upload_status?: string | null
          video_url?: string | null
          wallet_points?: number
        }
        Update: {
          category?: string | null
          coming_soon?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_rate?: number
          featured_discount_type?: string
          featured_discount_value?: number
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_active?: boolean
          margin_percentage?: number | null
          mrp?: number
          name?: string
          price?: number
          purchase_rate?: number
          section?: string | null
          stock?: number
          storage_provider?: string | null
          updated_at?: string
          updated_by?: string | null
          upload_status?: string | null
          video_url?: string | null
          wallet_points?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          business_address: string | null
          business_city: string | null
          business_email: string | null
          business_phone: string | null
          business_pincode: string | null
          business_state: string | null
          company_name: string | null
          created_at: string
          customer_id: string | null
          date_of_birth: string | null
          delivery_type: string | null
          email: string | null
          fcm_token: string | null
          full_name: string | null
          gst_number: string | null
          id: string
          is_approved: boolean
          is_available: boolean
          is_blocked: boolean
          is_super_admin: boolean
          is_verified: boolean
          last_login_at: string | null
          latitude: number | null
          local_body_id: string | null
          longitude: number | null
          mobile_number: string | null
          password_status: string
          referral_code: string | null
          referred_by: string | null
          role_id: string | null
          seller_type: string | null
          updated_at: string
          user_id: string
          user_type: string
          verification_code: string | null
          verification_code_expires_at: string | null
          verified_at: string | null
          ward_number: number | null
        }
        Insert: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          business_city?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_pincode?: string | null
          business_state?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string | null
          date_of_birth?: string | null
          delivery_type?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_approved?: boolean
          is_available?: boolean
          is_blocked?: boolean
          is_super_admin?: boolean
          is_verified?: boolean
          last_login_at?: string | null
          latitude?: number | null
          local_body_id?: string | null
          longitude?: number | null
          mobile_number?: string | null
          password_status?: string
          referral_code?: string | null
          referred_by?: string | null
          role_id?: string | null
          seller_type?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified_at?: string | null
          ward_number?: number | null
        }
        Update: {
          avatar_url?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_address?: string | null
          business_city?: string | null
          business_email?: string | null
          business_phone?: string | null
          business_pincode?: string | null
          business_state?: string | null
          company_name?: string | null
          created_at?: string
          customer_id?: string | null
          date_of_birth?: string | null
          delivery_type?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name?: string | null
          gst_number?: string | null
          id?: string
          is_approved?: boolean
          is_available?: boolean
          is_blocked?: boolean
          is_super_admin?: boolean
          is_verified?: boolean
          last_login_at?: string | null
          latitude?: number | null
          local_body_id?: string | null
          longitude?: number | null
          mobile_number?: string | null
          password_status?: string
          referral_code?: string | null
          referred_by?: string | null
          role_id?: string | null
          seller_type?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
          verification_code?: string | null
          verification_code_expires_at?: string | null
          verified_at?: string | null
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_counter: {
        Row: {
          id: string
          last_number: number
          updated_at: string
        }
        Insert: {
          id?: string
          last_number?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          image_url: string | null
          invalid_tokens_cleared: number
          link_url: string | null
          message: string
          sent_at: string | null
          sent_count: number
          status: string
          target_audience: string
          target_local_body_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          invalid_tokens_cleared?: number
          link_url?: string | null
          message: string
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_audience?: string
          target_local_body_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          image_url?: string | null
          invalid_tokens_cleared?: number
          link_url?: string | null
          message?: string
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_audience?: string
          target_local_body_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      scratch_card_claims: {
        Row: {
          card_id: string
          claimed_at: string
          id: string
          reward_amount: number
          user_id: string
          wallet_tx_id: string | null
        }
        Insert: {
          card_id: string
          claimed_at?: string
          id?: string
          reward_amount?: number
          user_id: string
          wallet_tx_id?: string | null
        }
        Update: {
          card_id?: string
          claimed_at?: string
          id?: string
          reward_amount?: number
          user_id?: string
          wallet_tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scratch_card_claims_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "scratch_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_cards: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          is_active: boolean
          max_claims_per_user: number
          product_discount_text: string | null
          product_link_url: string | null
          requires_agent_streak_days: number | null
          reveal_image_url: string | null
          reveal_text: string | null
          reward_amount: number
          start_at: string
          subtitle: string | null
          target_audience: string
          target_local_body_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          is_active?: boolean
          max_claims_per_user?: number
          product_discount_text?: string | null
          product_link_url?: string | null
          requires_agent_streak_days?: number | null
          reveal_image_url?: string | null
          reveal_text?: string | null
          reward_amount?: number
          start_at?: string
          subtitle?: string | null
          target_audience?: string
          target_local_body_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          is_active?: boolean
          max_claims_per_user?: number
          product_discount_text?: string | null
          product_link_url?: string | null
          requires_agent_streak_days?: number | null
          reveal_image_url?: string | null
          reveal_text?: string | null
          reward_amount?: number
          start_at?: string
          subtitle?: string | null
          target_audience?: string
          target_local_body_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_godown_assignments: {
        Row: {
          created_at: string
          godown_id: string
          id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          godown_id: string
          id?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          godown_id?: string
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_godown_assignments_godown_id_fkey"
            columns: ["godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_product_micro_godowns: {
        Row: {
          created_at: string
          godown_id: string
          id: string
          seller_product_id: string
        }
        Insert: {
          created_at?: string
          godown_id: string
          id?: string
          seller_product_id: string
        }
        Update: {
          created_at?: string
          godown_id?: string
          id?: string
          seller_product_id?: string
        }
        Relationships: []
      }
      seller_products: {
        Row: {
          area_godown_id: string | null
          assign_to_all_micro_godowns: boolean
          category: string | null
          coming_soon: boolean
          created_at: string
          description: string | null
          discount_rate: number
          featured_discount_type: string
          featured_discount_value: number
          id: string
          image_url: string | null
          image_url_2: string | null
          image_url_3: string | null
          is_active: boolean
          is_approved: boolean
          is_featured: boolean
          is_grocery: boolean
          margin_percentage: number | null
          mrp: number
          name: string
          price: number
          purchase_rate: number
          seller_id: string
          stock: number
          storage_provider: string | null
          updated_at: string
          upload_status: string | null
          video_url: string | null
          wallet_points: number
        }
        Insert: {
          area_godown_id?: string | null
          assign_to_all_micro_godowns?: boolean
          category?: string | null
          coming_soon?: boolean
          created_at?: string
          description?: string | null
          discount_rate?: number
          featured_discount_type?: string
          featured_discount_value?: number
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_active?: boolean
          is_approved?: boolean
          is_featured?: boolean
          is_grocery?: boolean
          margin_percentage?: number | null
          mrp?: number
          name: string
          price?: number
          purchase_rate?: number
          seller_id: string
          stock?: number
          storage_provider?: string | null
          updated_at?: string
          upload_status?: string | null
          video_url?: string | null
          wallet_points?: number
        }
        Update: {
          area_godown_id?: string | null
          assign_to_all_micro_godowns?: boolean
          category?: string | null
          coming_soon?: boolean
          created_at?: string
          description?: string | null
          discount_rate?: number
          featured_discount_type?: string
          featured_discount_value?: number
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          is_active?: boolean
          is_approved?: boolean
          is_featured?: boolean
          is_grocery?: boolean
          margin_percentage?: number | null
          mrp?: number
          name?: string
          price?: number
          purchase_rate?: number
          seller_id?: string
          stock?: number
          storage_provider?: string | null
          updated_at?: string
          upload_status?: string | null
          video_url?: string | null
          wallet_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "seller_products_area_godown_id_fkey"
            columns: ["area_godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          seller_id: string
          settled_by: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          seller_id: string
          settled_by?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          seller_id?: string
          settled_by?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "seller_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      stock_transfers: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          from_godown_id: string
          id: string
          product_id: string
          quantity: number
          status: string
          to_godown_id: string
          transfer_type: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          from_godown_id: string
          id?: string
          product_id: string
          quantity: number
          status?: string
          to_godown_id: string
          transfer_type?: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          from_godown_id?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          to_godown_id?: string
          transfer_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_godown_id_fkey"
            columns: ["from_godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_godown_id_fkey"
            columns: ["to_godown_id"]
            isOneToOne: false
            referencedRelation: "godowns"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_providers: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_enabled: boolean
          priority: number
          provider_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          is_enabled?: boolean
          priority?: number
          provider_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_enabled?: boolean
          priority?: number
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_seller_areas: {
        Row: {
          created_at: string
          id: string
          local_body_id: string
          seller_user_id: string
          updated_at: string
          ward_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          local_body_id: string
          seller_user_id: string
          updated_at?: string
          ward_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          local_body_id?: string
          seller_user_id?: string
          updated_at?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_seller_areas_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_service_categories: {
        Row: {
          auto_cancel_minutes: number | null
          category_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          auto_cancel_minutes?: number | null
          category_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          auto_cancel_minutes?: number | null
          category_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      utility_service_requests: {
        Row: {
          address: string | null
          address_id: string | null
          admin_notes: string | null
          availability_unit: string | null
          availability_value: number | null
          cancelled_by: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          customer_user_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          preferred_date: string | null
          quantity: number
          quoted_amount: number | null
          service_id: string
          status: string
          total_amount: number | null
          unit_price: number | null
          updated_at: string
          utility_push_sent_at: string | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          address?: string | null
          address_id?: string | null
          admin_notes?: string | null
          availability_unit?: string | null
          availability_value?: number | null
          cancelled_by?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          customer_user_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          preferred_date?: string | null
          quantity?: number
          quoted_amount?: number | null
          service_id: string
          status?: string
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
          utility_push_sent_at?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          address?: string | null
          address_id?: string | null
          admin_notes?: string | null
          availability_unit?: string | null
          availability_value?: number | null
          cancelled_by?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          customer_user_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          preferred_date?: string | null
          quantity?: number
          quoted_amount?: number | null
          service_id?: string
          status?: string
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string
          utility_push_sent_at?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_service_requests_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "utility_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_service_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "utility_service_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_service_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          mrp: number
          pack_size: number
          price: number
          service_id: string
          sort_order: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          mrp?: number
          pack_size?: number
          price?: number
          service_id: string
          sort_order?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          mrp?: number
          pack_size?: number
          price?: number
          service_id?: string
          sort_order?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_service_variants_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "utility_services"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_services: {
        Row: {
          category_id: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          coverage_area: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_approved: boolean
          local_body_id: string | null
          name: string
          price: number
          price_unit: string
          provider_user_id: string | null
          requires_location: boolean
          sort_order: number
          updated_at: string
          ward_number: number | null
        }
        Insert: {
          category_id?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          coverage_area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_approved?: boolean
          local_body_id?: string | null
          name: string
          price?: number
          price_unit?: string
          provider_user_id?: string | null
          requires_location?: boolean
          sort_order?: number
          updated_at?: string
          ward_number?: number | null
        }
        Update: {
          category_id?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          coverage_area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_approved?: boolean
          local_body_id?: string | null
          name?: string
          price?: number
          price_unit?: string
          provider_user_id?: string | null
          requires_location?: boolean
          sort_order?: number
          updated_at?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "utility_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_services_local_body_id_fkey"
            columns: ["local_body_id"]
            isOneToOne: false
            referencedRelation: "locations_local_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_commission_row: { Args: { _id: string }; Returns: string }
      am_i_verified: { Args: never; Returns: boolean }
      anonymize_user_data: { Args: { _uid: string }; Returns: undefined }
      auto_cancel_stale_utility_requests: { Args: never; Returns: number }
      can_use_community: { Args: never; Returns: boolean }
      cancel_community_invite: {
        Args: { _invite_id: string }
        Returns: boolean
      }
      cancel_my_utility_request: {
        Args: { _request_id: string }
        Returns: boolean
      }
      confirm_account_verification: {
        Args: { _code: string }
        Returns: boolean
      }
      create_community: { Args: { _name: string }; Returns: string }
      delete_account_data: { Args: { _uid: string }; Returns: Json }
      delete_my_community: { Args: never; Returns: boolean }
      get_community_member_revenue: {
        Args: { _community_id: string; _from?: string; _to?: string }
        Returns: {
          cost: number
          full_name: string
          is_creator: boolean
          joined_at: string
          mobile_number: string
          order_count: number
          profit: number
          revenue: number
          unmatched_items: number
          user_id: string
        }[]
      }
      get_community_members: {
        Args: never
        Returns: {
          days_until_removal: number
          full_name: string
          is_creator: boolean
          joined_at: string
          last_order_at: string
          mobile_number: string
          user_id: string
        }[]
      }
      get_community_pending_invites: {
        Args: never
        Returns: {
          created_at: string
          invite_id: string
          invited_mobile: string
        }[]
      }
      get_community_revenue_summary: {
        Args: { _from?: string; _to?: string }
        Returns: {
          community_id: string
          community_name: string
          cost: number
          creator_mobile: string
          creator_name: string
          creator_user_id: string
          member_count: number
          order_count: number
          profit: number
          revenue: number
          unmatched_items: number
        }[]
      }
      get_delivery_push_secret: { Args: never; Returns: string }
      get_my_community: {
        Args: never
        Returns: {
          community_id: string
          created_at: string
          creator_name: string
          is_creator: boolean
          member_count: number
          name: string
        }[]
      }
      get_my_community_invites: {
        Args: never
        Returns: {
          community_id: string
          community_name: string
          created_at: string
          creator_name: string
          invite_id: string
        }[]
      }
      get_next_purchase_number: { Args: never; Returns: number }
      get_orders_for_seller: {
        Args: { seller_user_id: string }
        Returns: {
          assigned_delivery_staff_id: string | null
          created_at: string
          delivery_charge: number
          delivery_contact_attempted_at: string | null
          delivery_push_sent_at: string | null
          godown_id: string | null
          id: string
          is_self_delivery: boolean
          items: Json
          seller_id: string | null
          seller_product_id: string | null
          seller_push_sent_at: string | null
          shipping_address: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_utility_providers: {
        Args: never
        Returns: {
          avatar_url: string
          business_address: string
          company_name: string
          display_name: string
          local_body_name: string
          mobile_number: string
          provider_user_id: string
          ward_number: number
        }[]
      }
      has_permission: { Args: { _permission_name: string }; Returns: boolean }
      invite_to_community: { Args: { _mobile: string }; Returns: string }
      is_community_creator: {
        Args: { _community_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      my_community_id: { Args: never; Returns: string }
      my_normalized_mobile: { Args: never; Returns: string }
      prune_inactive_community_members: { Args: never; Returns: number }
      remove_community_member: { Args: { _user_id: string }; Returns: boolean }
      request_community_access: {
        Args: { _community_name: string; _reason?: string }
        Returns: string
      }
      respond_to_community_invite: {
        Args: { _accept: boolean; _invite_id: string }
        Returns: boolean
      }
      review_community_access: {
        Args: {
          _approve: boolean
          _notes?: string
          _request_id: string
          _role_id?: string
        }
        Returns: undefined
      }
      save_commission_allocation_rows: {
        Args: { _from: string; _rows: Json; _to: string }
        Returns: number
      }
      start_account_verification: { Args: never; Returns: string }
      verify_commission_allocation: {
        Args: { _amount: number; _id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
