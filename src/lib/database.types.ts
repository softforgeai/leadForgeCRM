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
type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
type TicketPriority = "low" | "normal" | "high" | "urgent";
type TicketCategory = "bug" | "question" | "billing" | "feature_request" | "account" | "other";

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
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
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
      support_tickets: {
        Row: {
          id: string;
          number: number;
          workspace_id: string;
          created_by: string | null;
          created_by_name: string;
          created_by_email: string;
          subject: string;
          category: TicketCategory;
          priority: TicketPriority;
          status: TicketStatus;
          page_url: string | null;
          created_at: string;
          updated_at: string;
          last_message_at: string;
          last_message_by_staff: boolean;
          resolved_at: string | null;
        };
        Insert: Record<string, never>;
        Update: {
          status?: TicketStatus;
          priority?: TicketPriority;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          id: number;
          ticket_id: string;
          author_id: string | null;
          author_name: string;
          is_staff: boolean;
          is_internal: boolean;
          body: string;
          created_at: string;
        };
        Insert: {
          ticket_id: string;
          author_id?: string | null;
          author_name: string;
          is_staff?: boolean;
          is_internal?: boolean;
          body: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      impersonation_sessions: {
        Row: {
          id: string;
          admin_id: string;
          target_user_id: string;
          workspace_id: string | null;
          reason: string;
          started_at: string;
          expires_at: string;
          ended_at: string | null;
        };
        Insert: {
          admin_id: string;
          target_user_id: string;
          workspace_id?: string | null;
          reason: string;
          expires_at: string;
        };
        Update: { ended_at?: string | null };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: number;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          workspace_id: string | null;
          target_user_id: string | null;
          ticket_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          workspace_id?: string | null;
          target_user_id?: string | null;
          ticket_id?: string | null;
          details?: Json;
        };
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
      create_support_ticket: {
        Args: {
          p_workspace: string;
          p_subject: string;
          p_category: TicketCategory;
          p_priority: TicketPriority;
          p_body: string;
          p_page_url: string | null;
        };
        Returns: string;
      };
      reply_support_ticket: { Args: { p_ticket: string; p_body: string }; Returns: undefined };
      resolve_support_ticket: { Args: { p_ticket: string }; Returns: undefined };
      admin_workspace_overview: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          is_demo: boolean;
          created_at: string;
          owner_id: string | null;
          owner_name: string | null;
          owner_email: string | null;
          member_count: number;
          lead_count: number;
          leads_30d: number;
          open_value_cents: number;
          won_value_cents: number;
          last_activity_at: string | null;
          open_tickets: number;
        }[];
      };
      admin_platform_stats: {
        Args: Record<string, never>;
        Returns: {
          workspaces: number;
          workspaces_30d: number;
          users: number;
          users_30d: number;
          active_users_7d: number;
          leads: number;
          leads_30d: number;
          active_workspaces_7d: number;
          open_tickets: number;
          urgent_tickets: number;
          awaiting_reply: number;
        }[];
      };
      admin_signups_by_week: {
        Args: { p_weeks?: number };
        Returns: { week_start: string; workspaces: number; users: number }[];
      };
      admin_user_activity: {
        Args: { p_users: string[] };
        Returns: { user_id: string; last_sign_in_at: string | null; created_at: string }[];
      };
      admin_list_users: {
        Args: {
          p_q?: string | null;
          p_workspace?: string | null;
          p_role?: MemberRole | null;
          p_status?: string | null;
          p_include_demo?: boolean;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          email: string | null;
          name: string;
          created_at: string;
          last_sign_in_at: string | null;
          email_confirmed_at: string | null;
          is_platform_admin: boolean;
          memberships: Json;
          total_count: number;
        }[];
      };
      is_manager: { Args: { ws: string }; Returns: boolean };
      member_role_in: { Args: { ws: string }; Returns: MemberRole };
    };
    Enums: {
      member_role: MemberRole;
      stage_kind: StageKind;
      lead_source: LeadSource;
      activity_type: ActivityType;
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
      ticket_category: TicketCategory;
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
export type SupportTicket = Tables<"support_tickets">;
export type SupportMessage = Tables<"support_messages">;
export type TicketStatusT = TicketStatus;
export type TicketPriorityT = TicketPriority;
export type TicketCategoryT = TicketCategory;
