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
      activities: {
        Row: {
          category: string | null
          created_at: string
          end_date: string | null
          evidence_url: string | null
          hours_per_week: number | null
          id: string
          impact: string | null
          organization: string | null
          role: string | null
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          evidence_url?: string | null
          hours_per_week?: number | null
          id?: string
          impact?: string | null
          organization?: string | null
          role?: string | null
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          end_date?: string | null
          evidence_url?: string | null
          hours_per_week?: number | null
          id?: string
          impact?: string | null
          organization?: string | null
          role?: string | null
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          aid_status: string | null
          created_at: string
          deadline: string | null
          decision: string | null
          id: string
          interview_date: string | null
          level: string | null
          missing_documents: string[] | null
          notes: string | null
          platform: string | null
          program: string | null
          round: string | null
          status: string
          university_id: string | null
          university_name: string
          updated_at: string
          user_id: string
          visa_status: string | null
        }
        Insert: {
          aid_status?: string | null
          created_at?: string
          deadline?: string | null
          decision?: string | null
          id?: string
          interview_date?: string | null
          level?: string | null
          missing_documents?: string[] | null
          notes?: string | null
          platform?: string | null
          program?: string | null
          round?: string | null
          status?: string
          university_id?: string | null
          university_name: string
          updated_at?: string
          user_id: string
          visa_status?: string | null
        }
        Update: {
          aid_status?: string | null
          created_at?: string
          deadline?: string | null
          decision?: string | null
          id?: string
          interview_date?: string | null
          level?: string | null
          missing_documents?: string[] | null
          notes?: string | null
          platform?: string | null
          program?: string | null
          round?: string | null
          status?: string
          university_id?: string | null
          university_name?: string
          updated_at?: string
          user_id?: string
          visa_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          ats_score: number | null
          content: Json | null
          created_at: string
          headline: string | null
          id: string
          summary: string | null
          template: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          content?: Json | null
          created_at?: string
          headline?: string | null
          id?: string
          summary?: string | null
          template?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_score?: number | null
          content?: Json | null
          created_at?: string
          headline?: string | null
          id?: string
          summary?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activities: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          current_level: string | null
          date_of_birth: string | null
          field_of_study: string | null
          full_name: string | null
          gender: string | null
          github_url: string | null
          gmat: number | null
          gpa: number | null
          graduation_year: number | null
          gre: number | null
          honors: string | null
          id: string
          ielts: number | null
          intake_year: number | null
          interests: string | null
          languages: string[] | null
          linkedin_url: string | null
          orcid: string | null
          path_budget: string | null
          path_completed: boolean
          path_goal: string | null
          path_timeline: string | null
          path_type: string | null
          phone: string | null
          publications: string | null
          sat: number | null
          school_name: string | null
          target_countries: string[] | null
          target_level: string | null
          toefl: number | null
          ug_pathway: string | null
          updated_at: string
          website_url: string | null
          work_experience: string | null
        }
        Insert: {
          activities?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
          date_of_birth?: string | null
          field_of_study?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          gmat?: number | null
          gpa?: number | null
          graduation_year?: number | null
          gre?: number | null
          honors?: string | null
          id: string
          ielts?: number | null
          intake_year?: number | null
          interests?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          orcid?: string | null
          path_budget?: string | null
          path_completed?: boolean
          path_goal?: string | null
          path_timeline?: string | null
          path_type?: string | null
          phone?: string | null
          publications?: string | null
          sat?: number | null
          school_name?: string | null
          target_countries?: string[] | null
          target_level?: string | null
          toefl?: number | null
          ug_pathway?: string | null
          updated_at?: string
          website_url?: string | null
          work_experience?: string | null
        }
        Update: {
          activities?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_level?: string | null
          date_of_birth?: string | null
          field_of_study?: string | null
          full_name?: string | null
          gender?: string | null
          github_url?: string | null
          gmat?: number | null
          gpa?: number | null
          graduation_year?: number | null
          gre?: number | null
          honors?: string | null
          id?: string
          ielts?: number | null
          intake_year?: number | null
          interests?: string | null
          languages?: string[] | null
          linkedin_url?: string | null
          orcid?: string | null
          path_budget?: string | null
          path_completed?: boolean
          path_goal?: string | null
          path_timeline?: string | null
          path_type?: string | null
          phone?: string | null
          publications?: string | null
          sat?: number | null
          school_name?: string | null
          target_countries?: string[] | null
          target_level?: string | null
          toefl?: number | null
          ug_pathway?: string | null
          updated_at?: string
          website_url?: string | null
          work_experience?: string | null
        }
        Relationships: []
      }
      publications: {
        Row: {
          citations: number | null
          coauthors: string | null
          created_at: string
          doi: string | null
          id: string
          link: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          venue: string | null
          year: number | null
        }
        Insert: {
          citations?: number | null
          coauthors?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          link?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          venue?: string | null
          year?: number | null
        }
        Update: {
          citations?: number | null
          coauthors?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          link?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          venue?: string | null
          year?: number | null
        }
        Relationships: []
      }
      recommenders: {
        Row: {
          affiliation: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          relationship: string | null
          requested_at: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          relationship?: string | null
          requested_at?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          relationship?: string | null
          requested_at?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_opportunities: {
        Row: {
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          field: string | null
          host: string | null
          id: string
          link: string | null
          stipend: string | null
          title: string
          type: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          field?: string | null
          host?: string | null
          id?: string
          link?: string | null
          stipend?: string | null
          title: string
          type?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          field?: string | null
          host?: string | null
          id?: string
          link?: string | null
          stipend?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          amount: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          eligibility: string | null
          fields: string[] | null
          fully_funded: boolean
          id: string
          level: string | null
          link: string | null
          name: string
          provider: string | null
        }
        Insert: {
          amount?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          fields?: string[] | null
          fully_funded?: boolean
          id?: string
          level?: string | null
          link?: string | null
          name: string
          provider?: string | null
        }
        Update: {
          amount?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility?: string | null
          fields?: string[] | null
          fully_funded?: boolean
          id?: string
          level?: string | null
          link?: string | null
          name?: string
          provider?: string | null
        }
        Relationships: []
      }
      sops: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          content: string | null
          created_at: string
          id: string
          program: string | null
          prompt: string | null
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          content?: string | null
          created_at?: string
          id?: string
          program?: string | null
          prompt?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          content?: string | null
          created_at?: string
          id?: string
          program?: string | null
          prompt?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string | null
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          acceptance_rate: number | null
          admission_notes: string | null
          application_deadline: string | null
          arwu_rank: number | null
          avg_gpa: number | null
          campus_type: string | null
          city: string | null
          continent: string | null
          country: string
          created_at: string
          currency: string | null
          description: string | null
          det_min: number | null
          employability_rank: number | null
          established_year: number | null
          exchange_partners: string | null
          faculties: string[] | null
          gmat_required: boolean | null
          gre_required: boolean | null
          housing_cost_usd: number | null
          id: string
          ielts_min: number | null
          image_url: string | null
          intl_ratio: number | null
          language: string | null
          latitude: number | null
          levels: string[] | null
          living_cost_usd: number | null
          longitude: number | null
          name: string
          notable_alumni: string[] | null
          post_study_work: string | null
          pr_pathway: string | null
          programs: string[] | null
          qs_rank: number | null
          region: string | null
          required_documents: string[] | null
          research_areas: string[] | null
          scholarships_info: string | null
          student_count: number | null
          the_rank: number | null
          toefl_min: number | null
          tuition_max_usd: number | null
          tuition_min_usd: number | null
          tuition_usd: number | null
          visa_info: string | null
          website: string | null
          work_during_study: string | null
          world_rank: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          admission_notes?: string | null
          application_deadline?: string | null
          arwu_rank?: number | null
          avg_gpa?: number | null
          campus_type?: string | null
          city?: string | null
          continent?: string | null
          country: string
          created_at?: string
          currency?: string | null
          description?: string | null
          det_min?: number | null
          employability_rank?: number | null
          established_year?: number | null
          exchange_partners?: string | null
          faculties?: string[] | null
          gmat_required?: boolean | null
          gre_required?: boolean | null
          housing_cost_usd?: number | null
          id?: string
          ielts_min?: number | null
          image_url?: string | null
          intl_ratio?: number | null
          language?: string | null
          latitude?: number | null
          levels?: string[] | null
          living_cost_usd?: number | null
          longitude?: number | null
          name: string
          notable_alumni?: string[] | null
          post_study_work?: string | null
          pr_pathway?: string | null
          programs?: string[] | null
          qs_rank?: number | null
          region?: string | null
          required_documents?: string[] | null
          research_areas?: string[] | null
          scholarships_info?: string | null
          student_count?: number | null
          the_rank?: number | null
          toefl_min?: number | null
          tuition_max_usd?: number | null
          tuition_min_usd?: number | null
          tuition_usd?: number | null
          visa_info?: string | null
          website?: string | null
          work_during_study?: string | null
          world_rank?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          admission_notes?: string | null
          application_deadline?: string | null
          arwu_rank?: number | null
          avg_gpa?: number | null
          campus_type?: string | null
          city?: string | null
          continent?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          det_min?: number | null
          employability_rank?: number | null
          established_year?: number | null
          exchange_partners?: string | null
          faculties?: string[] | null
          gmat_required?: boolean | null
          gre_required?: boolean | null
          housing_cost_usd?: number | null
          id?: string
          ielts_min?: number | null
          image_url?: string | null
          intl_ratio?: number | null
          language?: string | null
          latitude?: number | null
          levels?: string[] | null
          living_cost_usd?: number | null
          longitude?: number | null
          name?: string
          notable_alumni?: string[] | null
          post_study_work?: string | null
          pr_pathway?: string | null
          programs?: string[] | null
          qs_rank?: number | null
          region?: string | null
          required_documents?: string[] | null
          research_areas?: string[] | null
          scholarships_info?: string | null
          student_count?: number | null
          the_rank?: number | null
          toefl_min?: number | null
          tuition_max_usd?: number | null
          tuition_min_usd?: number | null
          tuition_usd?: number | null
          visa_info?: string | null
          website?: string | null
          work_during_study?: string | null
          world_rank?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
