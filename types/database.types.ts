// Supabase CLI-compatible shape generated from supabase/migrations.
// Regenerate against the linked remote project before deployment; see supabase/README.md.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: { id: number; table_name: string; operation: string; record_id: string | null; changed_by: string | null; changed_role: string | null; old_data: Json | null; new_data: Json | null; changed_at: string };
        Insert: { id?: never; table_name: string; operation: string; record_id?: string | null; changed_by?: string | null; changed_role?: string | null; old_data?: Json | null; new_data?: Json | null; changed_at?: string };
        Update: { id?: never; table_name?: string; operation?: string; record_id?: string | null; changed_by?: string | null; changed_role?: string | null; old_data?: Json | null; new_data?: Json | null; changed_at?: string };
        Relationships: [];
      };
      users: {
        Row: { id: string; auth_user_id: string | null; username: string; prefix: string | null; first_name: string; last_name: string; role: string; created_at: string };
        Insert: { id?: string; auth_user_id?: string | null; username: string; prefix?: string | null; first_name: string; last_name: string; role?: string; created_at?: string };
        Update: { id?: string; auth_user_id?: string | null; username?: string; prefix?: string | null; first_name?: string; last_name?: string; role?: string; created_at?: string };
        Relationships: [];
      };
      patients: {
        Row: { id: string; hn: string; prefix: string | null; full_name: string | null; gender: string | null; age: number | null; smi_type: string | null; substance: string | null; admit_date: string | null; admitting_doctor: string | null; oas_score: number | null; oas_risk: string | null; raw_data: Json | null; created_at: string };
        Insert: { id?: string; hn: string; prefix?: string | null; full_name?: string | null; gender?: string | null; age?: number | null; smi_type?: string | null; substance?: string | null; admit_date?: string | null; admitting_doctor?: string | null; oas_score?: number | null; oas_risk?: string | null; raw_data?: Json | null; created_at?: string };
        Update: { id?: string; hn?: string; prefix?: string | null; full_name?: string | null; gender?: string | null; age?: number | null; smi_type?: string | null; substance?: string | null; admit_date?: string | null; admitting_doctor?: string | null; oas_score?: number | null; oas_risk?: string | null; raw_data?: Json | null; created_at?: string };
        Relationships: [];
      };
      assessments: {
        Row: { id: string; hn: string; record_type: string | null; assess_date: string | null; shift: string | null; oas_score: number | null; phua_risk: string | null; ghard_risk: string | null; phua_scores: Json | null; ghard_scores: Json | null; raw_data: Json | null; created_at: string };
        Insert: { id?: string; hn: string; record_type?: string | null; assess_date?: string | null; shift?: string | null; oas_score?: number | null; phua_risk?: string | null; ghard_risk?: string | null; phua_scores?: Json | null; ghard_scores?: Json | null; raw_data?: Json | null; created_at?: string };
        Update: { id?: string; hn?: string; record_type?: string | null; assess_date?: string | null; shift?: string | null; oas_score?: number | null; phua_risk?: string | null; ghard_risk?: string | null; phua_scores?: Json | null; ghard_scores?: Json | null; raw_data?: Json | null; created_at?: string };
        Relationships: [];
      };
      backup: {
        Row: { id: string; hn: string; prefix: string | null; full_name: string | null; gender: string | null; age: number | null; smi_type: string | null; substance: string | null; admit_date: string | null; admitting_doctor: string | null; last_diagnosis: string | null; discharge_method: string | null; discharge_date: string | null; discharge_type: string | null; discharged_at: string; raw_data: Json | null };
        Insert: { id?: string; hn: string; prefix?: string | null; full_name?: string | null; gender?: string | null; age?: number | null; smi_type?: string | null; substance?: string | null; admit_date?: string | null; admitting_doctor?: string | null; last_diagnosis?: string | null; discharge_method?: string | null; discharge_date?: string | null; discharge_type?: string | null; discharged_at?: string; raw_data?: Json | null };
        Update: { id?: string; hn?: string; prefix?: string | null; full_name?: string | null; gender?: string | null; age?: number | null; smi_type?: string | null; substance?: string | null; admit_date?: string | null; admitting_doctor?: string | null; last_diagnosis?: string | null; discharge_method?: string | null; discharge_date?: string | null; discharge_type?: string | null; discharged_at?: string; raw_data?: Json | null };
        Relationships: [];
      };
      ior_records: {
        Row: { id: string; hn: string; record_date: string; behaviors: Json; level: string; created_at: string };
        Insert: { id?: string; hn: string; record_date: string; behaviors?: Json; level: string; created_at?: string };
        Update: { id?: string; hn?: string; record_date?: string; behaviors?: Json; level?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: {
      ior_statistics: {
        Row: { id: string | null; hn: string | null; record_date: string | null; behaviors: Json | null; level: string | null; created_at: string | null; full_name: string | null; gender: string | null; smi_type: string | null };
        Relationships: [];
      };
    };
    Functions: {
      current_app_role: { Args: Record<PropertyKey, never>; Returns: string };
      discharge_patient: { Args: { p_hn: string; p_discharge_method: string; p_discharge_date: string; p_last_diagnosis: string; p_discharge_type: string }; Returns: string };
      register_patient_with_assessment: { Args: { p_profile: Json; p_assessment: Json }; Returns: Json };
      update_patient_with_assessment: { Args: { p_profile: Json; p_assessment_id: string; p_raw_data: Json }; Returns: string };
    };
    Enums: Record<PropertyKey, never>;
    CompositeTypes: Record<PropertyKey, never>;
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never;

export type TablesInsert<DefaultSchemaTableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][DefaultSchemaTableName] extends { Insert: infer I } ? I : never;

export type TablesUpdate<DefaultSchemaTableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][DefaultSchemaTableName] extends { Update: infer U } ? U : never;
