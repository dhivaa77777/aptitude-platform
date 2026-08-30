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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          id: string
          target_id: string | null
          target_type: string
          timestamp: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          id?: string
          target_id?: string | null
          target_type: string
          timestamp?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          id?: string
          target_id?: string | null
          target_type?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_questions: {
        Row: {
          attempt_id: string
          correct_option_id_snapshot: string | null
          display_order: number
          id: string
          is_correct: boolean | null
          option_order_seed: number
          question_id: string
          time_spent_seconds: number | null
          user_selected_option_id: string | null
        }
        Insert: {
          attempt_id: string
          correct_option_id_snapshot?: string | null
          display_order: number
          id?: string
          is_correct?: boolean | null
          option_order_seed: number
          question_id: string
          time_spent_seconds?: number | null
          user_selected_option_id?: string | null
        }
        Update: {
          attempt_id?: string
          correct_option_id_snapshot?: string | null
          display_order?: number
          id?: string
          is_correct?: boolean | null
          option_order_seed?: number
          question_id?: string
          time_spent_seconds?: number | null
          user_selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_questions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_correct_option_id_snapshot_fkey"
            columns: ["correct_option_id_snapshot"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_questions_user_selected_option_id_fkey"
            columns: ["user_selected_option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          display_order: number
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          display_order?: number
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_groups: {
        Row: {
          content: string
          created_at: string
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_type: Database["public"]["Enums"]["group_type"]
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
        }
        Relationships: []
      }
      question_tags: {
        Row: {
          id: string
          question_id: string
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Insert: {
          id?: string
          question_id: string
          tag_type: Database["public"]["Enums"]["tag_type"]
          tag_value: string
        }
        Update: {
          id?: string
          question_id?: string
          tag_type?: Database["public"]["Enums"]["tag_type"]
          tag_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          assigned_difficulty: number
          computed_difficulty: number | null
          created_at: string
          estimated_time_seconds: number | null
          explanation: string | null
          group_id: string | null
          id: string
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          shuffle_options: boolean
          status: Database["public"]["Enums"]["question_status"]
          updated_at: string
          version: number
        }
        Insert: {
          assigned_difficulty: number
          computed_difficulty?: number | null
          created_at?: string
          estimated_time_seconds?: number | null
          explanation?: string | null
          group_id?: string | null
          id?: string
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          shuffle_options?: boolean
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_difficulty?: number
          computed_difficulty?: number | null
          created_at?: string
          estimated_time_seconds?: number | null
          explanation?: string | null
          group_id?: string | null
          id?: string
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          shuffle_options?: boolean
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "question_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          generated_at: string
          id: string
          reason: string
          recommended_action_json: Json
          topic: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          reason: string
          recommended_action_json?: Json
          topic: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          reason?: string
          recommended_action_json?: Json
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          accuracy: number | null
          configuration_json: Json
          ended_at: string | null
          guest_session_id: string | null
          id: string
          mode: Database["public"]["Enums"]["attempt_mode"]
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          configuration_json?: Json
          ended_at?: string | null
          guest_session_id?: string | null
          id?: string
          mode: Database["public"]["Enums"]["attempt_mode"]
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          configuration_json?: Json
          ended_at?: string | null
          guest_session_id?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["attempt_mode"]
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          preparation_fields: string[]
          settings_json: Json
          user_id: string
        }
        Insert: {
          preparation_fields?: string[]
          settings_json?: Json
          user_id: string
        }
        Update: {
          preparation_fields?: string[]
          settings_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_history: {
        Row: {
          last_seen_at: string
          question_id: string
          times_seen: number
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          question_id?: string
          times_seen?: number
          user_id: string
        }
        Update: {
          last_seen_at?: string
          question_id?: string
          times_seen?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_stats: {
        Row: {
          attempts: number
          avg_time_seconds: number | null
          correct: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          avg_time_seconds?: number | null
          correct?: number
          topic: string
          user_id: string
        }
        Update: {
          attempts?: number
          avg_time_seconds?: number | null
          correct?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          mfa_enabled: boolean
          name: string
          role: Database["public"]["Enums"]["role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          mfa_enabled?: boolean
          name: string
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mfa_enabled?: boolean
          name?: string
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["role"]
      }
      is_email_taken: { Args: { email: string }; Returns: boolean }
      is_username_taken: { Args: { username: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_target_id: string | null
          p_target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attempt_mode: "PRACTICE" | "TEST"
      attempt_status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED"
      group_type: "DI_TABLE" | "DI_CHART" | "RC_PASSAGE" | "CASELET"
      question_status: "ACTIVE" | "REVIEW_REQUIRED" | "DISABLED"
      question_type: "MCQ" | "MULTI"
      role: "LEARNER" | "ADMIN" | "MASTER_ADMIN"
      tag_type: "FIELD" | "CATEGORY" | "TOPIC" | "SUBTOPIC"
      user_status: "ACTIVE" | "SUSPENDED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attempt_mode: ["PRACTICE", "TEST"],
      attempt_status: ["IN_PROGRESS", "COMPLETED", "ABANDONED"],
      group_type: ["DI_TABLE", "DI_CHART", "RC_PASSAGE", "CASELET"],
      question_status: ["ACTIVE", "REVIEW_REQUIRED", "DISABLED"],
      question_type: ["MCQ", "MULTI"],
      role: ["LEARNER", "ADMIN", "MASTER_ADMIN"],
      tag_type: ["FIELD", "CATEGORY", "TOPIC", "SUBTOPIC"],
      user_status: ["ACTIVE", "SUSPENDED"],
    },
  },
} as const