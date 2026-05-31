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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          account_owner_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          health_note: string | null
          health_status_id: number
          health_updated_at: string | null
          health_updated_by: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          account_owner_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health_note?: string | null
          health_status_id?: number
          health_updated_at?: string | null
          health_updated_by?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_owner_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          health_note?: string | null
          health_status_id?: number
          health_updated_at?: string | null
          health_updated_by?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_health_status_id_fkey"
            columns: ["health_status_id"]
            isOneToOne: false
            referencedRelation: "company_health_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_health_updated_by_fkey"
            columns: ["health_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_primary: boolean
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          company_id: string
          from_status_id: number | null
          id: string
          note: string | null
          to_status_id: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          company_id: string
          from_status_id?: number | null
          id?: string
          note?: string | null
          to_status_id: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          from_status_id?: number | null
          id?: string
          note?: string | null
          to_status_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_health_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_history_from_status_id_fkey"
            columns: ["from_status_id"]
            isOneToOne: false
            referencedRelation: "company_health_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_history_to_status_id_fkey"
            columns: ["to_status_id"]
            isOneToOne: false
            referencedRelation: "company_health_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_statuses: {
        Row: {
          color_class: string
          display_order: number
          emoji: string
          id: number
          label: string
          level: number
          name: string
        }
        Insert: {
          color_class: string
          display_order: number
          emoji: string
          id: number
          label: string
          level: number
          name: string
        }
        Update: {
          color_class?: string
          display_order?: number
          emoji?: string
          id?: number
          label?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      escalation_history: {
        Row: {
          created_at: string | null
          from_support_level:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          from_team_id: string | null
          id: string
          notes: string | null
          ticket_id: string
          to_support_level:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          to_team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          from_team_id?: string | null
          id?: string
          notes?: string | null
          ticket_id: string
          to_support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          to_team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          from_team_id?: string | null
          id?: string
          notes?: string | null
          ticket_id?: string
          to_support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          to_team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_history_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          service: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kb_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_collections: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          environment: string
          id: string
          name: string
          owner_team_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          name: string
          owner_team_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          name?: string
          owner_team_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_collections_owner_team_id_fkey"
            columns: ["owner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_tokens: number | null
          created_at: string
          document_id: string
          document_version_id: string
          embedding: string | null
          id: string
          metadata: Json
          page_number: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          content_tokens?: number | null
          created_at?: string
          document_id: string
          document_version_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_tokens?: number | null
          created_at?: string
          document_id?: string
          document_version_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          page_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_document_chunks_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "kb_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_statuses: {
        Row: {
          code: string
          id: number
          label: string
        }
        Insert: {
          code: string
          id: number
          label: string
        }
        Update: {
          code?: string
          id?: number
          label?: string
        }
        Relationships: []
      }
      kb_document_tags: {
        Row: {
          document_id: string
          tag_id: string
        }
        Insert: {
          document_id: string
          tag_id: string
        }
        Update: {
          document_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_document_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "kb_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_document_versions: {
        Row: {
          created_at: string
          document_id: string
          extracted_text: string | null
          file_sha256: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          original_filename: string
          page_count: number | null
          processed_at: string | null
          processing_error: string | null
          status_id: number
          storage_path: string
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          document_id: string
          extracted_text?: string | null
          file_sha256?: string | null
          file_size_bytes: number
          id?: string
          mime_type: string
          original_filename: string
          page_count?: number | null
          processed_at?: string | null
          processing_error?: string | null
          status_id?: number
          storage_path: string
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          document_id?: string
          extracted_text?: string | null
          file_sha256?: string | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          original_filename?: string
          page_count?: number | null
          processed_at?: string | null
          processing_error?: string | null
          status_id?: number
          storage_path?: string
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_document_versions_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "kb_document_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          ai_retrieval_enabled: boolean
          archived_at: string | null
          collection_id: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json
          source_type_id: number
          title: string
          updated_at: string
        }
        Insert: {
          ai_retrieval_enabled?: boolean
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          source_type_id?: number
          title: string
          updated_at?: string
        }
        Update: {
          ai_retrieval_enabled?: boolean
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          source_type_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "kb_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "kb_document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_documents_source_type_id_fkey"
            columns: ["source_type_id"]
            isOneToOne: false
            referencedRelation: "kb_source_types"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_resolution_settings: {
        Row: {
          ai_retrieval_enabled: boolean
          archived_at: string | null
          collection_id: string | null
          manual_notes: string | null
          ticket_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_retrieval_enabled?: boolean
          archived_at?: string | null
          collection_id?: string | null
          manual_notes?: string | null
          ticket_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_retrieval_enabled?: boolean
          archived_at?: string | null
          collection_id?: string | null
          manual_notes?: string | null
          ticket_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_resolution_settings_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "kb_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_resolution_settings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_resolution_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_retrieval_config: {
        Row: {
          environment: string
          max_results: number
          similarity_threshold: number
          source_weights: Json
          sources_enabled: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          environment?: string
          max_results?: number
          similarity_threshold?: number
          source_weights?: Json
          sources_enabled?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          environment?: string
          max_results?: number
          similarity_threshold?: number
          source_weights?: Json
          sources_enabled?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_retrieval_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_retrieval_log: {
        Row: {
          created_at: string
          id: string
          query_text: string | null
          result_count: number
          results: Json
          ticket_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query_text?: string | null
          result_count?: number
          results?: Json
          ticket_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query_text?: string | null
          result_count?: number
          results?: Json
          ticket_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_retrieval_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_retrieval_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_source_types: {
        Row: {
          code: string
          id: number
          label: string
        }
        Insert: {
          code: string
          id: number
          label: string
        }
        Update: {
          code?: string
          id?: number
          label?: string
        }
        Relationships: []
      }
      kb_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      link_types: {
        Row: {
          id: string
          inverse_id: string
          inverse_label: string
          is_symmetric: boolean
          label: string
          sort_order: number
        }
        Insert: {
          id: string
          inverse_id: string
          inverse_label: string
          is_symmetric?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          id?: string
          inverse_id?: string
          inverse_label?: string
          is_symmetric?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "link_types_inverse_fk"
            columns: ["inverse_id"]
            isOneToOne: false
            referencedRelation: "link_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_by: string | null
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          lead_id: string | null
          methodology: Database["public"]["Enums"]["project_methodology"]
          name: string
          next_item_number: number
          sprint_duration_weeks: number
          status: Database["public"]["Enums"]["project_status"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          lead_id?: string | null
          methodology?: Database["public"]["Enums"]["project_methodology"]
          name: string
          next_item_number?: number
          sprint_duration_weeks?: number
          status?: Database["public"]["Enums"]["project_status"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          lead_id?: string | null
          methodology?: Database["public"]["Enums"]["project_methodology"]
          name?: string
          next_item_number?: number
          sprint_duration_weeks?: number
          status?: Database["public"]["Enums"]["project_status"]
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_instances: {
        Row: {
          created_at: string
          id: string
          paused_at: string | null
          policy_id: string
          resolution_due_at: string
          responded_at: string | null
          response_due_at: string
          ticket_id: string
          total_paused_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          paused_at?: string | null
          policy_id: string
          resolution_due_at: string
          responded_at?: string | null
          response_due_at: string
          ticket_id: string
          total_paused_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          paused_at?: string | null
          policy_id?: string
          resolution_due_at?: string
          responded_at?: string | null
          response_due_at?: string
          ticket_id?: string
          total_paused_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_instances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_instances_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority_id: number
          resolution_time_minutes: number
          response_time_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority_id: number
          resolution_time_minutes: number
          response_time_minutes: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority_id?: number
          resolution_time_minutes?: number
          response_time_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: true
            referencedRelation: "ticket_priorities"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          project_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["sprint_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          project_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          project_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["sprint_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color_class: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color_class?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color_class?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      task_action_tags: {
        Row: {
          id: number
          label: string
          name: string
          sort_order: number
        }
        Insert: {
          id: number
          label: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: number
          label?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      task_statuses: {
        Row: {
          id: number
          is_final: boolean
          label: string
          name: string
          sort_order: number
        }
        Insert: {
          id: number
          is_final?: boolean
          label: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: number
          is_final?: boolean
          label?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          action_tag_id: number
          assigned_to: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority_enum"]
          status_id: number
          ticket_id: string | null
          time_spent_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_tag_id?: number
          assigned_to: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority_enum"]
          status_id?: number
          ticket_id?: string | null
          time_spent_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_tag_id?: number
          assigned_to?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority_enum"]
          status_id?: number
          ticket_id?: string | null
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_action_tag_id_fkey"
            columns: ["action_tag_id"]
            isOneToOne: false
            referencedRelation: "task_action_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          added_by: string | null
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          support_level:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_type: Database["public"]["Enums"]["team_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_type?: Database["public"]["Enums"]["team_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_type?: Database["public"]["Enums"]["team_type_enum"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          display_order: number
          id: number
          label: string
          name: string
        }
        Insert: {
          display_order: number
          id: number
          label: string
          name: string
        }
        Update: {
          display_order?: number
          id?: number
          label?: string
          name?: string
        }
        Relationships: []
      }
      ticket_collaborators: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          support_level:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_id: string
          ticket_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_id: string
          ticket_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          support_level?:
            | Database["public"]["Enums"]["support_level_enum"]
            | null
          team_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_collaborators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_collaborators_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_collaborators_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
          time_worked_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          time_worked_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          time_worked_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          changes: Json
          created_at: string | null
          field_name: string | null
          id: string
          metadata: Json
          new_value: string | null
          old_value: string | null
          source_id: string | null
          source_table: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          source_id?: string | null
          source_table?: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          source_id?: string | null
          source_table?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_priorities: {
        Row: {
          color_class: string
          display_order: number
          id: number
          label: string
          name: string
        }
        Insert: {
          color_class: string
          display_order: number
          id: number
          label: string
          name: string
        }
        Update: {
          color_class?: string
          display_order?: number
          id?: number
          label?: string
          name?: string
        }
        Relationships: []
      }
      ticket_statuses: {
        Row: {
          badge_variant: string
          display_order: number
          id: number
          is_final: boolean
          label: string
          name: string
        }
        Insert: {
          badge_variant?: string
          display_order: number
          id: number
          is_final?: boolean
          label: string
          name: string
        }
        Update: {
          badge_variant?: string
          display_order?: number
          id?: number
          is_final?: boolean
          label?: string
          name?: string
        }
        Relationships: []
      }
      ticket_support_levels: {
        Row: {
          color_class: string
          description: string
          display_order: number
          id: number
          label: string
          name: string
        }
        Insert: {
          color_class: string
          description: string
          display_order: number
          id: number
          label: string
          name: string
        }
        Update: {
          color_class?: string
          description?: string
          display_order?: number
          id?: number
          label?: string
          name?: string
        }
        Relationships: []
      }
      ticket_tags: {
        Row: {
          created_at: string
          tag_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_temperatures: {
        Row: {
          color_class: string
          display_order: number
          emoji: string
          id: number
          label: string
          name: string
        }
        Insert: {
          color_class: string
          display_order: number
          emoji: string
          id: number
          label: string
          name: string
        }
        Update: {
          color_class?: string
          display_order?: number
          emoji?: string
          id?: number
          label?: string
          name?: string
        }
        Relationships: []
      }
      ticket_work_item_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          link_type: string
          note: string | null
          ticket_id: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          link_type: string
          note?: string | null
          ticket_id: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          link_type?: string
          note?: string | null
          ticket_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_work_item_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_work_item_links_link_type_fkey"
            columns: ["link_type"]
            isOneToOne: false
            referencedRelation: "link_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_work_item_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_work_item_links_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          category_id: number | null
          cc_email: string | null
          client_email: string | null
          client_name: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          description: string
          id: string
          priority_id: number
          resolution: string | null
          resolution_embedding: string | null
          resolution_plain: string | null
          resolved_at: string | null
          search_vector: unknown
          status_id: number
          support_level_id: number | null
          team_id: string | null
          temperature_id: number | null
          ticket_number: number
          time_worked_minutes: number
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          category_id?: number | null
          cc_email?: string | null
          client_email?: string | null
          client_name?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          description: string
          id?: string
          priority_id: number
          resolution?: string | null
          resolution_embedding?: string | null
          resolution_plain?: string | null
          resolved_at?: string | null
          search_vector?: unknown
          status_id?: number
          support_level_id?: number | null
          team_id?: string | null
          temperature_id?: number | null
          ticket_number?: number
          time_worked_minutes?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          category_id?: number | null
          cc_email?: string | null
          client_email?: string | null
          client_name?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          description?: string
          id?: string
          priority_id?: number
          resolution?: string | null
          resolution_embedding?: string | null
          resolution_plain?: string | null
          resolved_at?: string | null
          search_vector?: unknown
          status_id?: number
          support_level_id?: number | null
          team_id?: string | null
          temperature_id?: number | null
          ticket_number?: number
          time_worked_minutes?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "ticket_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_support_level_id_fkey"
            columns: ["support_level_id"]
            isOneToOne: false
            referencedRelation: "ticket_support_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_temperature_id_fkey"
            columns: ["temperature_id"]
            isOneToOne: false
            referencedRelation: "ticket_temperatures"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_comments: {
        Row: {
          attachments: Json
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          work_item_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          work_item_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_comments_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_history: {
        Row: {
          action: string
          changes: Json
          created_at: string
          field_name: string | null
          id: string
          metadata: Json
          new_value: string | null
          old_value: string | null
          source_id: string | null
          source_table: string | null
          user_id: string | null
          work_item_id: string
        }
        Insert: {
          action: string
          changes?: Json
          created_at?: string
          field_name?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          source_id?: string | null
          source_table?: string | null
          user_id?: string | null
          work_item_id: string
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          field_name?: string | null
          id?: string
          metadata?: Json
          new_value?: string | null
          old_value?: string | null
          source_id?: string | null
          source_table?: string | null
          user_id?: string | null
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_history_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          link_type: string
          note: string | null
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          link_type: string
          note?: string | null
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          link_type?: string
          note?: string | null
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_links_link_type_fkey"
            columns: ["link_type"]
            isOneToOne: false
            referencedRelation: "link_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          item_key: string
          parent_id: string | null
          priority_id: number | null
          project_id: string
          rank: string
          reporter_id: string | null
          sprint_id: string | null
          status: Database["public"]["Enums"]["work_item_status"]
          story_points: number | null
          title: string
          type: Database["public"]["Enums"]["work_item_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_key: string
          parent_id?: string | null
          priority_id?: number | null
          project_id: string
          rank: string
          reporter_id?: string | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          story_points?: number | null
          title: string
          type?: Database["public"]["Enums"]["work_item_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_key?: string
          parent_id?: string | null
          priority_id?: number | null
          project_id?: string
          rank?: string
          reporter_id?: string | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          story_points?: number | null
          title?: string
          type?: Database["public"]["Enums"]["work_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "ticket_priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_top_kb_source: {
        Args: { days_back?: number }
        Returns: {
          cnt: number
          title: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_support_or_admin: { Args: { uid: string }; Returns: boolean }
      log_ticket_field_change: {
        Args: {
          p_field_name: string
          p_metadata?: Json
          p_new_value: string
          p_old_value: string
          p_ticket_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          metadata: Json
          similarity: number
          snippet: string
          source_id: string
          source_type: string
          title: string
        }[]
      }
      match_resolutions: {
        Args: {
          exclude_ticket_id?: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          id: string
          resolution: string
          similarity: number
          ticket_number: number
          title: string
        }[]
      }
      pm_can_read_project: {
        Args: { p_project_id: string; p_user: string }
        Returns: boolean
      }
      pm_can_write_project: {
        Args: { p_project_id: string; p_user: string }
        Returns: boolean
      }
      set_primary_item_link: { Args: { p_link_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      strip_html_to_plain: { Args: { html: string }; Returns: string }
    }
    Enums: {
      client_temperature: "hot" | "warm" | "cool"
      project_methodology: "scrum" | "kanban" | "waterfall"
      project_status: "active" | "archived"
      sprint_status: "planned" | "active" | "completed"
      support_level_enum: "L1" | "L2" | "L3"
      task_priority_enum: "low" | "medium" | "high" | "urgent"
      team_category:
        | "functional"
        | "l1_support"
        | "l2_technical"
        | "l3_engineering"
      team_type_enum: "business" | "support" | "engineering"
      ticket_category:
        | "bug"
        | "feature_request"
        | "question"
        | "configuration_request"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_response"
        | "resolved"
        | "closed"
        | "new"
        | "pending_customer"
        | "pending_internal"
        | "escalated"
      ticket_status_new:
        | "new"
        | "pending_customer"
        | "pending_internal"
        | "escalated"
        | "resolved"
        | "closed"
      user_role: "admin" | "support_lead" | "support_member" | "client"
      work_item_status: "todo" | "in_progress" | "in_review" | "done" | "rework"
      work_item_type: "epic" | "story" | "task" | "bug"
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
      client_temperature: ["hot", "warm", "cool"],
      project_methodology: ["scrum", "kanban", "waterfall"],
      project_status: ["active", "archived"],
      sprint_status: ["planned", "active", "completed"],
      support_level_enum: ["L1", "L2", "L3"],
      task_priority_enum: ["low", "medium", "high", "urgent"],
      team_category: [
        "functional",
        "l1_support",
        "l2_technical",
        "l3_engineering",
      ],
      team_type_enum: ["business", "support", "engineering"],
      ticket_category: [
        "bug",
        "feature_request",
        "question",
        "configuration_request",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_response",
        "resolved",
        "closed",
        "new",
        "pending_customer",
        "pending_internal",
        "escalated",
      ],
      ticket_status_new: [
        "new",
        "pending_customer",
        "pending_internal",
        "escalated",
        "resolved",
        "closed",
      ],
      user_role: ["admin", "support_lead", "support_member", "client"],
      work_item_status: ["todo", "in_progress", "in_review", "done", "rework"],
      work_item_type: ["epic", "story", "task", "bug"],
    },
  },
} as const
