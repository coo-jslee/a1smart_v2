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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          ip_address: unknown
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          ip_address?: unknown
          target_id?: string
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          biz_number: string | null
          budget_max: number | null
          budget_min: number | null
          classification: string | null
          created_at: string
          created_by: string | null
          customer_no: string | null
          customer_type: string[]
          email: string | null
          grade: string | null
          id: string
          is_corp: boolean
          is_multi_owner: boolean | null
          last_contact_at: string | null
          memo: string | null
          name: string
          phone: string | null
          preferred_area: string | null
          status: string
          updated_at: string
        }
        Insert: {
          biz_number?: string | null
          budget_max?: number | null
          budget_min?: number | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          customer_no?: string | null
          customer_type?: string[]
          email?: string | null
          grade?: string | null
          id?: string
          is_corp?: boolean
          is_multi_owner?: boolean | null
          last_contact_at?: string | null
          memo?: string | null
          name: string
          phone?: string | null
          preferred_area?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          biz_number?: string | null
          budget_max?: number | null
          budget_min?: number | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          customer_no?: string | null
          customer_type?: string[]
          email?: string | null
          grade?: string | null
          id?: string
          is_corp?: boolean
          is_multi_owner?: boolean | null
          last_contact_at?: string | null
          memo?: string | null
          name?: string
          phone?: string | null
          preferred_area?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          asr_code: string | null
          created_at: string
          error_code: string | null
          id: number
          message: string
          payload: Json | null
          severity: string
          stack_trace: string | null
          stage: string
          user_id: string | null
        }
        Insert: {
          asr_code?: string | null
          created_at?: string
          error_code?: string | null
          id?: number
          message: string
          payload?: Json | null
          severity?: string
          stack_trace?: string | null
          stage: string
          user_id?: string | null
        }
        Update: {
          asr_code?: string | null
          created_at?: string
          error_code?: string | null
          id?: number
          message?: string
          payload?: Json | null
          severity?: string
          stack_trace?: string | null
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      extractions: {
        Row: {
          asr_code: string
          confidence: number | null
          created_at: string
          doc_type: string
          extracted_json: Json
          gongbu_id: string
          id: string
          llm_model: string | null
          ocr_text: string | null
          prompt_version: string | null
        }
        Insert: {
          asr_code: string
          confidence?: number | null
          created_at?: string
          doc_type: string
          extracted_json: Json
          gongbu_id: string
          id?: string
          llm_model?: string | null
          ocr_text?: string | null
          prompt_version?: string | null
        }
        Update: {
          asr_code?: string
          confidence?: number | null
          created_at?: string
          doc_type?: string
          extracted_json?: Json
          gongbu_id?: string
          id?: string
          llm_model?: string | null
          ocr_text?: string | null
          prompt_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extractions_asr_code_fkey"
            columns: ["asr_code"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["asr_code"]
          },
          {
            foreignKeyName: "extractions_gongbu_id_fkey"
            columns: ["gongbu_id"]
            isOneToOne: false
            referencedRelation: "gongbu_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      gongbu_documents: {
        Row: {
          asr_code: string
          attempts: number
          cost: number | null
          created_at: string
          doc_type: string
          id: string
          issue_number: string | null
          issued_date: string | null
          storage_path: string
          success: boolean
          uploaded_by: string | null
        }
        Insert: {
          asr_code: string
          attempts?: number
          cost?: number | null
          created_at?: string
          doc_type: string
          id?: string
          issue_number?: string | null
          issued_date?: string | null
          storage_path: string
          success?: boolean
          uploaded_by?: string | null
        }
        Update: {
          asr_code?: string
          attempts?: number
          cost?: number | null
          created_at?: string
          doc_type?: string
          id?: string
          issue_number?: string | null
          issued_date?: string | null
          storage_path?: string
          success?: boolean
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gongbu_documents_asr_code_fkey"
            columns: ["asr_code"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["asr_code"]
          },
        ]
      }
      price_history: {
        Row: {
          area_m2: number | null
          asr_code: string
          confidence: number | null
          consensus_meta: Json | null
          contract_date: string | null
          floor_no: number | null
          id: number
          is_consensus: boolean
          monthly_rent: number | null
          price: number | null
          raw_payload: Json | null
          recorded_at: string
          source: string | null
          trade_type: string
          unit_price_m2: number | null
        }
        Insert: {
          area_m2?: number | null
          asr_code: string
          confidence?: number | null
          consensus_meta?: Json | null
          contract_date?: string | null
          floor_no?: number | null
          id?: number
          is_consensus?: boolean
          monthly_rent?: number | null
          price?: number | null
          raw_payload?: Json | null
          recorded_at?: string
          source?: string | null
          trade_type: string
          unit_price_m2?: number | null
        }
        Update: {
          area_m2?: number | null
          asr_code?: string
          confidence?: number | null
          consensus_meta?: Json | null
          contract_date?: string | null
          floor_no?: number | null
          id?: number
          is_consensus?: boolean
          monthly_rent?: number | null
          price?: number | null
          raw_payload?: Json | null
          recorded_at?: string
          source?: string | null
          trade_type?: string
          unit_price_m2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_asr_code_fkey"
            columns: ["asr_code"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["asr_code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_jibun: string | null
          address_road: string | null
          agent_id: string | null
          asr_code: string
          attachment_paths: string[]
          building_name: string | null
          built_year: number | null
          created_at: string
          desired_close_by: string | null
          exclusive_m2: number | null
          floor_no: number | null
          gongsi_jiga: number | null
          image_paths: string[]
          internal_note: string | null
          is_distressed: boolean
          is_public: boolean
          jeonse_deposit: number | null
          land_m2: number | null
          land_use_zone: string | null
          lawd_cd: string | null
          list_date: string | null
          monthly_deposit: number | null
          monthly_rent: number | null
          mortgage_total: number | null
          next_review_date: string | null
          owner_id: string | null
          pnu: string
          property_type: string | null
          risk_grade: string | null
          risk_summary: string | null
          sale_price: number | null
          senior_creditor: string | null
          source: string | null
          status: string
          structure: string | null
          supply_m2: number | null
          total_floors: number | null
          transaction_type: string | null
          unit_price_m2: number | null
          updated_at: string
          violation: boolean
          workflow_stage: string
        }
        Insert: {
          address_jibun?: string | null
          address_road?: string | null
          agent_id?: string | null
          asr_code: string
          attachment_paths?: string[]
          building_name?: string | null
          built_year?: number | null
          created_at?: string
          desired_close_by?: string | null
          exclusive_m2?: number | null
          floor_no?: number | null
          gongsi_jiga?: number | null
          image_paths?: string[]
          internal_note?: string | null
          is_distressed?: boolean
          is_public?: boolean
          jeonse_deposit?: number | null
          land_m2?: number | null
          land_use_zone?: string | null
          lawd_cd?: string | null
          list_date?: string | null
          monthly_deposit?: number | null
          monthly_rent?: number | null
          mortgage_total?: number | null
          next_review_date?: string | null
          owner_id?: string | null
          pnu: string
          property_type?: string | null
          risk_grade?: string | null
          risk_summary?: string | null
          sale_price?: number | null
          senior_creditor?: string | null
          source?: string | null
          status?: string
          structure?: string | null
          supply_m2?: number | null
          total_floors?: number | null
          transaction_type?: string | null
          unit_price_m2?: number | null
          updated_at?: string
          violation?: boolean
          workflow_stage?: string
        }
        Update: {
          address_jibun?: string | null
          address_road?: string | null
          agent_id?: string | null
          asr_code?: string
          attachment_paths?: string[]
          building_name?: string | null
          built_year?: number | null
          created_at?: string
          desired_close_by?: string | null
          exclusive_m2?: number | null
          floor_no?: number | null
          gongsi_jiga?: number | null
          image_paths?: string[]
          internal_note?: string | null
          is_distressed?: boolean
          is_public?: boolean
          jeonse_deposit?: number | null
          land_m2?: number | null
          land_use_zone?: string | null
          lawd_cd?: string | null
          list_date?: string | null
          monthly_deposit?: number | null
          monthly_rent?: number | null
          mortgage_total?: number | null
          next_review_date?: string | null
          owner_id?: string | null
          pnu?: string
          property_type?: string | null
          risk_grade?: string | null
          risk_summary?: string | null
          sale_price?: number | null
          senior_creditor?: string | null
          source?: string | null
          status?: string
          structure?: string | null
          supply_m2?: number | null
          total_floors?: number | null
          transaction_type?: string | null
          unit_price_m2?: number | null
          updated_at?: string
          violation?: boolean
          workflow_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          asr_code: string | null
          created_at: string
          error_message: string | null
          file_type: string
          id: string
          mime_type: string | null
          original_name: string | null
          processed_at: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          uploader_id: string
        }
        Insert: {
          asr_code?: string | null
          created_at?: string
          error_message?: string | null
          file_type: string
          id?: string
          mime_type?: string | null
          original_name?: string | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          uploader_id: string
        }
        Update: {
          asr_code?: string | null
          created_at?: string
          error_message?: string | null
          file_type?: string
          id?: string
          mime_type?: string | null
          original_name?: string | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_asr_code_fkey"
            columns: ["asr_code"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["asr_code"]
          },
        ]
      }
    }
    Views: {
      v_lawd_code_map: {
        Row: {
          lawd_cd: string | null
          sigungu_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_internal_note: {
        Args: { p_asr_code: string; p_note: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
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
