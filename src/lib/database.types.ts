/**
 * Database types for supabase-js.
 *
 * Mirrors supabase/migrations. Regenerate from the live schema with
 * `npm run db:types` after linking the Supabase project; that overwrites this
 * file with the generated version.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type MemberRole = "owner" | "admin" | "rep";
type StageKind = "open" | "won" | "lost";
type LeadSource = "website" | "referral" | "linkedin" | "ads" | "other";
type ActivityType = "created" | "note" | "call" | "email" | "stage_change" | "assigned" | "follow_up";

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          form_token: string;
          is_demo: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          form_token?: string;
          is_demo?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          display_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: MemberRole;
          display_name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          role?: MemberRole;
          display_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: MemberRole;
          token: string;
          invited_by: string | null;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role?: MemberRole;
          token?: string;
          invited_by?: string | null;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          position: number;
          kind: StageKind;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          position: number;
          kind?: StageKind;
          created_at?: string;
        };
        Update: {
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          source: LeadSource;
          value_cents: number;
          stage_id: string;
          assigned_to: string | null;
          tags: string[];
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: LeadSource;
          value_cents?: number;
          stage_id: string;
          assigned_to?: string | null;
          tags?: string[];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: LeadSource;
          value_cents?: number;
          stage_id?: string;
          assigned_to?: string | null;
          tags?: string[];
          notes?: string | null;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: number;
          workspace_id: string;
          lead_id: string;
          actor_id: string | null;
          type: ActivityType;
          body: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          lead_id: string;
          actor_id?: string | null;
          type: ActivityType;
          body?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string;
          assigned_to: string;
          task: string;
          due_at: string;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id: string;
          assigned_to: string;
          task: string;
          due_at: string;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          task?: string;
          due_at?: string;
          completed_at?: string | null;
          assigned_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: { id: number; workspace_id: string; ip_hash: string; created_at: string };
        Insert: { workspace_id: string; ip_hash: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_workspace: { Args: { p_name: string; p_display_name: string }; Returns: string };
      accept_invitation: { Args: { p_token: string; p_display_name: string }; Returns: string };
      set_member_role: {
        Args: { p_workspace: string; p_user: string; p_role: MemberRole };
        Returns: undefined;
      };
      remove_member: { Args: { p_workspace: string; p_user: string }; Returns: undefined };
      regenerate_form_token: { Args: { p_workspace: string }; Returns: string };
      lead_stats: {
        Args: { p_workspace: string };
        Returns: {
          stage_id: string;
          source: LeadSource;
          lead_count: number;
          value_cents: number;
          new_this_month: number;
        }[];
      };
      workspace_leaderboard: {
        Args: { p_workspace: string };
        Returns: { user_id: string; display_name: string; won_count: number; won_value_cents: number }[];
      };
      submit_lead_form: {
        Args: {
          p_token: string;
          p_name: string;
          p_email: string;
          p_company: string;
          p_phone: string;
          p_message: string;
          p_ip_hash: string;
        };
        Returns: undefined;
      };
      is_member: { Args: { ws: string }; Returns: boolean };
      is_manager: { Args: { ws: string }; Returns: boolean };
      member_role_in: { Args: { ws: string }; Returns: MemberRole };
    };
    Enums: {
      member_role: MemberRole;
      stage_kind: StageKind;
      lead_source: LeadSource;
      activity_type: ActivityType;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Workspace = Tables<"workspaces">;
export type Member = Tables<"workspace_members">;
export type Stage = Tables<"pipeline_stages">;
export type Lead = Tables<"leads">;
export type Activity = Tables<"activities">;
export type FollowUp = Tables<"follow_ups">;
export type Invitation = Tables<"invitations">;
export type MemberRoleT = MemberRole;
export type LeadSourceT = LeadSource;
