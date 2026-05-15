export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
      }
      tables: {
        Row: {
          id: string
          workspace_id: string
          name: string
          schema_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          schema_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          schema_json?: Json
          created_at?: string
        }
      }
      fields: {
        Row: {
          id: string
          table_id: string
          name: string
          type: string
          options_json: Json
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          name: string
          type: string
          options_json?: Json
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          name?: string
          type?: string
          options_json?: Json
          position?: number
          created_at?: string
        }
      }
      rows: {
        Row: {
          id: string
          table_id: string
          data_jsonb: Json
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          table_id: string
          data_jsonb?: Json
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          data_jsonb?: Json
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      views: {
        Row: {
          id: string
          table_id: string
          name: string
          filters_json: Json
          sorts_json: Json
          hidden_fields_json: Json
          row_height: string | null
          column_widths_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          name: string
          filters_json?: Json
          sorts_json?: Json
          hidden_fields_json?: Json
          row_height?: string | null
          column_widths_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          name?: string
          filters_json?: Json
          sorts_json?: Json
          hidden_fields_json?: Json
          row_height?: string | null
          column_widths_json?: Json
          created_at?: string
        }
      }
    }
  }
}
