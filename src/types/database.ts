export interface Database {
  public: {
    Tables: {
      company_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          npwp: string;
          idtku: string;
          address: string;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          npwp: string;
          idtku: string;
          address: string;
          email?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          npwp?: string;
          idtku?: string;
          address?: string;
          email?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          npwp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          npwp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          npwp?: string;
        };
        Relationships: [];
      };
      invoice_sessions: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          file_name: string;
          invoice_number: string;
          invoice_date: string;
          buyer_name: string;
          buyer_npwp: string;
          buyer_address: string;
          buyer_email: string;
          original_vat_rate: number;
          trx_code: string;
          additional_info: string;
          supporting_document: string;
          supporting_document_period: string;
          facility_stamp: string;
          buyer_document_type: string;
          buyer_country: string;
          buyer_document_number: string;
          mos_value: number;
          retensi_pct: number;
          subtotal: number;
          total_vat: number;
          grand_total: number;
          items: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          file_name: string;
          invoice_number: string;
          invoice_date: string;
          buyer_name?: string;
          buyer_npwp?: string;
          buyer_address?: string;
          buyer_email?: string;
          original_vat_rate?: number;
          trx_code?: string;
          additional_info?: string;
          supporting_document?: string;
          supporting_document_period?: string;
          facility_stamp?: string;
          buyer_document_type?: string;
          buyer_country?: string;
          buyer_document_number?: string;
          mos_value?: number;
          retensi_pct?: number;
          subtotal?: number;
          total_vat?: number;
          grand_total?: number;
          items?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string | null;
          file_name?: string;
          invoice_number?: string;
          invoice_date?: string;
          buyer_name?: string;
          buyer_npwp?: string;
          buyer_address?: string;
          buyer_email?: string;
          original_vat_rate?: number;
          trx_code?: string;
          additional_info?: string;
          supporting_document?: string;
          supporting_document_period?: string;
          facility_stamp?: string;
          buyer_document_type?: string;
          buyer_country?: string;
          buyer_document_number?: string;
          mos_value?: number;
          retensi_pct?: number;
          subtotal?: number;
          total_vat?: number;
          grand_total?: number;
          items?: unknown;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_session_id_fkey";
            columns: ["session_id"];
            referencedRelation: "invoice_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_active_profile: {
        Args: { profile_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
