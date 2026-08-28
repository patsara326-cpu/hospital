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
    PostgrestVersion: "14.15"
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
      activity_log: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          actor_username: string
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          request_id: string
          target_ref: string | null
          target_type: string | null
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          actor_username: string
          event_type: string
          id?: never
          metadata?: Json
          occurred_at?: string
          request_id?: string
          target_ref?: string | null
          target_type?: string | null
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          actor_username?: string
          event_type?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          request_id?: string
          target_ref?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      assessments: {
        Row: {
          assess_date: string | null
          created_at: string
          ghard_risk: string | null
          ghard_scores: Json | null
          hn: string
          id: string
          oas_score: number | null
          phua_risk: string | null
          phua_scores: Json | null
          raw_data: Json | null
          record_type: string | null
          shift: string | null
        }
        Insert: {
          assess_date?: string | null
          created_at?: string
          ghard_risk?: string | null
          ghard_scores?: Json | null
          hn: string
          id?: string
          oas_score?: number | null
          phua_risk?: string | null
          phua_scores?: Json | null
          raw_data?: Json | null
          record_type?: string | null
          shift?: string | null
        }
        Update: {
          assess_date?: string | null
          created_at?: string
          ghard_risk?: string | null
          ghard_scores?: Json | null
          hn?: string
          id?: string
          oas_score?: number | null
          phua_risk?: string | null
          phua_scores?: Json | null
          raw_data?: Json | null
          record_type?: string | null
          shift?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_username: string | null
          changed_fields: string[]
          changed_role: string | null
          id: number
          operation: string
          record_id: string | null
          record_ref: string | null
          table_name: string
          transaction_id: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_username?: string | null
          changed_fields?: string[]
          changed_role?: string | null
          id?: never
          operation: string
          record_id?: string | null
          record_ref?: string | null
          table_name: string
          transaction_id?: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_username?: string | null
          changed_fields?: string[]
          changed_role?: string | null
          id?: never
          operation?: string
          record_id?: string | null
          record_ref?: string | null
          table_name?: string
          transaction_id?: number
        }
        Relationships: []
      }
      backup: {
        Row: {
          admit_date: string | null
          admitting_doctor: string | null
          age: number | null
          discharge_date: string | null
          discharge_method: string | null
          discharge_type: string | null
          discharged_at: string
          full_name: string | null
          gender: string | null
          hn: string
          id: string
          last_diagnosis: string | null
          prefix: string | null
          raw_data: Json | null
          smi_type: string | null
          substance: string | null
        }
        Insert: {
          admit_date?: string | null
          admitting_doctor?: string | null
          age?: number | null
          discharge_date?: string | null
          discharge_method?: string | null
          discharge_type?: string | null
          discharged_at?: string
          full_name?: string | null
          gender?: string | null
          hn: string
          id?: string
          last_diagnosis?: string | null
          prefix?: string | null
          raw_data?: Json | null
          smi_type?: string | null
          substance?: string | null
        }
        Update: {
          admit_date?: string | null
          admitting_doctor?: string | null
          age?: number | null
          discharge_date?: string | null
          discharge_method?: string | null
          discharge_type?: string | null
          discharged_at?: string
          full_name?: string | null
          gender?: string | null
          hn?: string
          id?: string
          last_diagnosis?: string | null
          prefix?: string | null
          raw_data?: Json | null
          smi_type?: string | null
          substance?: string | null
        }
        Relationships: []
      }
      ior_records: {
        Row: {
          behaviors: Json
          created_at: string
          hn: string
          id: string
          level: string
          record_date: string
        }
        Insert: {
          behaviors?: Json
          created_at?: string
          hn: string
          id?: string
          level: string
          record_date: string
        }
        Update: {
          behaviors?: Json
          created_at?: string
          hn?: string
          id?: string
          level?: string
          record_date?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          admit_date: string | null
          admitting_doctor: string | null
          age: number | null
          created_at: string
          full_name: string | null
          gender: string | null
          hn: string
          id: string
          oas_risk: string | null
          oas_score: number | null
          prefix: string | null
          raw_data: Json | null
          smi_type: string | null
          substance: string | null
        }
        Insert: {
          admit_date?: string | null
          admitting_doctor?: string | null
          age?: number | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          hn: string
          id?: string
          oas_risk?: string | null
          oas_score?: number | null
          prefix?: string | null
          raw_data?: Json | null
          smi_type?: string | null
          substance?: string | null
        }
        Update: {
          admit_date?: string | null
          admitting_doctor?: string | null
          age?: number | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          hn?: string
          id?: string
          oas_risk?: string | null
          oas_score?: number | null
          prefix?: string | null
          raw_data?: Json | null
          smi_type?: string | null
          substance?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          prefix: string | null
          role: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          prefix?: string | null
          role?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          prefix?: string | null
          role?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      admission_statistics_rows: {
        Row: {
          admission_date: string | null
          admitting_doctor: string | null
          diagnosis: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          last_name: string | null
          residence_details: string | null
          residence_district: string | null
          residence_type: string | null
          report_date: string | null
          report_month: number | null
          report_year: number | null
          smi_v_result: string | null
          substance_type: string | null
        }
        Relationships: []
      }
      admin_log_entries: {
        Row: {
          actor_display_name: string | null
          actor_role: string | null
          actor_user_id: string | null
          actor_username: string | null
          changed_fields: string[] | null
          entry_id: string | null
          event_code: string | null
          metadata: Json | null
          occurred_at: string | null
          search_text: string | null
          source: string | null
          target_ref: string | null
          target_type: string | null
          transaction_id: number | null
        }
        Relationships: []
      }
      current_ipd_rows: {
        Row: {
          admission_date: string | null
          admission_source: string | null
          admitting_doctor: string | null
          age: number | null
          aggressive_behavior: string | null
          assessment_admit_date: string | null
          caregiver_name: string | null
          caregiver_phone: string | null
          caregiver_relation: string | null
          caregiver_status: string | null
          created_at: string | null
          diagnosis: string | null
          extra_data: Json | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          is_smi_v: Json | null
          last_name: string | null
          oas_risk: string | null
          oas_risk_level: string | null
          oas_score: number | null
          patient_phone: string | null
          prefix: string | null
          residence_details: string | null
          residence_district: string | null
          residence_subdistrict: string | null
          residence_type: string | null
          smi_type: string | null
          smi_v_result: string | null
          substance: string | null
          substance_type: string | null
          substance_use: string | null
        }
        Relationships: []
      }
      current_ipd_list_rows: {
        Row: {
          admission_date: string | null
          admitting_doctor: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          last_name: string | null
          patient_group: string | null
          prefix: string | null
          smi_v_result: string | null
        }
        Relationships: []
      }
      dashboard_patient_groups: {
        Row: {
          admitting_doctor: string | null
          gender: string | null
          oas_score: number | null
          patient_count: number | null
          smi_type: string | null
        }
        Relationships: []
      }
      dashboard_monthly_trends: {
        Row: {
          event_count: number | null
          month_start: string | null
          series: string | null
        }
        Relationships: []
      }
      discharge_statistics_rows: {
        Row: {
          admitting_doctor: string | null
          discharge_date: string | null
          discharge_type: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          last_diagnosis: string | null
          last_name: string | null
          residence_details: string | null
          residence_district: string | null
          residence_type: string | null
          report_date: string | null
          report_month: number | null
          report_year: number | null
          smi_type: string | null
          substance_type: string | null
        }
        Relationships: []
      }
      ior_statistics: {
        Row: {
          behaviors: Json | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          level: string | null
          record_date: string | null
          smi_type: string | null
        }
        Relationships: []
      }
      incident_statistics_rows: {
        Row: {
          full_name: string | null
          gender: string | null
          hn: string | null
          id: string | null
          level: string | null
          record_date: string | null
          report_date: string | null
          report_month: number | null
          report_year: number | null
          smi_type: string | null
        }
        Relationships: []
      }
      statistics_report_years: {
        Row: {
          gender: string | null
          report_type: string | null
          report_year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_app_role: { Args: never; Returns: string }
      get_dashboard_snapshot: {
        Args: never
        Returns: {
          monthly_trends: Json
          patient_groups: Json
        }[]
      }
      discharge_patient: {
        Args: {
          p_discharge_date: string
          p_discharge_method: string
          p_discharge_type: string
          p_hn: string
          p_last_diagnosis: string
        }
        Returns: string
      }
      record_app_activity: {
        Args: { p_event_type: string; p_metadata?: Json }
        Returns: number
      }
      try_report_date: { Args: { value: string }; Returns: string | null }
      register_patient_with_assessment: {
        Args: { p_assessment: Json; p_profile: Json }
        Returns: Json
      }
      update_patient_with_assessment: {
        Args: { p_assessment_id: string; p_profile: Json; p_raw_data: Json }
        Returns: string
      }
      write_activity_event: {
        Args: {
          p_event_type: string
          p_metadata?: Json
          p_target_ref?: string
          p_target_type?: string
        }
        Returns: number
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
