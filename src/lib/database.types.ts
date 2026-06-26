export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          bank_customer_id: string;
          national_id: string;
          last_name: string;
          first_name: string;
          age: number;
          marital_status: "single" | "married" | "divorced" | "widowed";
          children_count: number;
          annual_income: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          bank_customer_id?: string;
          national_id: string;
          last_name: string;
          first_name: string;
          age: number;
          marital_status: "single" | "married" | "divorced" | "widowed";
          children_count: number;
          annual_income: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
        Relationships: [];
      };
      credit_applications: {
        Row: {
          application_id: string;
          bank_customer_id: string;
          requested_amount: number;
          duration_value: number;
          duration_unit: "months" | "years";
          monthly_charges: number;
          status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          application_id?: string;
          bank_customer_id: string;
          requested_amount: number;
          duration_value: number;
          duration_unit: "months" | "years";
          monthly_charges: number;
          status?: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["credit_applications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "credit_applications_bank_customer_id_fkey";
            columns: ["bank_customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["bank_customer_id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
