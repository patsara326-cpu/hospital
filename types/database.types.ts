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
      users: {
        Row: {
          id: string;
          username: string;
          prefix: string | null;
          first_name: string;
          last_name: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          username: string;
          prefix: string;
          first_name: string;
          last_name: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          prefix?: string;
          first_name?: string;
          last_name?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string | null;
          hn: string;
          prefix: string | null;
          full_name: string | null;
          gender: string | null;
          age: number | null;
          smi_type: string | null;
          substance: string | null;
          admit_date: string | null;
          admitting_doctor: string | null;
          oas_score: number | null;
          oas_risk: string | null;
          raw_data: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string | null;
          hn: string;
          prefix?: string | null;
          full_name?: string | null;
          gender?: string | null;
          age?: number | null;
          smi_type?: string | null;
          substance?: string | null;
          admit_date?: string | null;
          admitting_doctor?: string | null;
          oas_score?: number | null;
          oas_risk?: string | null;
          raw_data?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string | null;
          hn?: string;
          prefix?: string | null;
          full_name?: string | null;
          gender?: string | null;
          age?: number | null;
          smi_type?: string | null;
          substance?: string | null;
          admit_date?: string | null;
          admitting_doctor?: string | null;
          oas_score?: number | null;
          oas_risk?: string | null;
          raw_data?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      assessments: {
        Row: {
          id: string;
          hn: string;
          record_type: string | null;
          assess_date: string | null;
          shift: string | null;
          oas_score: number | null;
          phua_risk: string | null;
          ghard_risk: string | null;
          phua_scores: Json | null;
          ghard_scores: Json | null;
          raw_data: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          hn: string;
          record_type?: string | null;
          assess_date?: string | null;
          shift?: string | null;
          oas_score?: number | null;
          phua_risk?: string | null;
          ghard_risk?: string | null;
          phua_scores?: Json | null;
          ghard_scores?: Json | null;
          raw_data?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          hn?: string;
          record_type?: string | null;
          assess_date?: string | null;
          shift?: string | null;
          oas_score?: number | null;
          phua_risk?: string | null;
          ghard_risk?: string | null;
          phua_scores?: Json | null;
          ghard_scores?: Json | null;
          raw_data?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      backup: {
        Row: {
          id: string | null;
          hn: string;
          prefix: string | null;
          full_name: string | null;
          gender: string | null;
          age: number | null;
          smi_type: string | null;
          substance: string | null;
          admit_date: string | null;
          admitting_doctor: string | null;
          last_diagnosis: string | null;
          discharge_method: string | null;
          discharge_date: string | null;
          discharge_type: string | null;
          discharged_at: string | null;
          raw_data: Json | null;
        };
        Insert: {
          id?: string | null;
          hn: string;
          prefix?: string | null;
          full_name?: string | null;
          gender?: string | null;
          age?: number | null;
          smi_type?: string | null;
          substance?: string | null;
          admit_date?: string | null;
          admitting_doctor?: string | null;
          last_diagnosis?: string | null;
          discharge_method?: string | null;
          discharge_date?: string | null;
          discharge_type?: string | null;
          discharged_at?: string | null;
          raw_data?: Json | null;
        };
        Update: {
          id?: string | null;
          hn?: string;
          prefix?: string | null;
          full_name?: string | null;
          gender?: string | null;
          age?: number | null;
          smi_type?: string | null;
          substance?: string | null;
          admit_date?: string | null;
          admitting_doctor?: string | null;
          last_diagnosis?: string | null;
          discharge_method?: string | null;
          discharge_date?: string | null;
          discharge_type?: string | null;
          discharged_at?: string | null;
          raw_data?: Json | null;
        };
        Relationships: [];
      };
      ior_records: {
        Row: {
          id: string;
          hn: string;
          record_date: string;
          behaviors: Json;
          level: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          hn: string;
          record_date: string;
          behaviors: Json;
          level: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          hn?: string;
          record_date?: string;
          behaviors?: Json;
          level?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
