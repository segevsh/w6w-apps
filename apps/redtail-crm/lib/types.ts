/**
 * Loosely-typed shapes for the Redtail resources this app touches.
 *
 * Each object type in Redtail's public API carries 30-90+ fields (see the
 * "TWAPI Documentation" Postman collection's own captured example responses),
 * far more than any single Action reads or writes. Rather than transcribing
 * every field — much of it write-only, deprecated, or account-specific — each
 * interface below names the handful of fields this app's actions actually
 * read or set, plus a `[key: string]: unknown` index so a real response's
 * untouched fields still typecheck when passed through.
 */

/** A Contact — person, business, trust, association or union. */
export interface RedtailContact {
  id?: number;
  type?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  company_name?: string;
  full_name?: string;
  job_title?: string;
  tax_id?: string;
  dob?: string;
  status_id?: number;
  status?: string;
  category_id?: number;
  category?: string;
  source_id?: number;
  source?: string;
  servicing_advisor_id?: number;
  servicing_advisor?: string;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

/** Create/update body for a Contact — a strict subset of `RedtailContact`'s fields are writable. */
export interface RedtailContactInput {
  type?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  tax_id?: string;
  dob?: string;
  status_id?: number;
  category_id?: number;
  source_id?: number;
  servicing_advisor_id?: number;
  [key: string]: unknown;
}

export interface RedtailAddress {
  id?: number;
  addressable_id?: number;
  addressable_type?: string;
  street_address?: string;
  secondary_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  address_type?: number;
  address_type_description?: string;
  is_primary?: boolean;
  is_preferred?: boolean;
  deleted?: boolean;
  [key: string]: unknown;
}

export interface RedtailAddressInput {
  street_address?: string;
  secondary_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  address_type?: number;
  is_primary?: boolean;
  is_preferred?: boolean;
  [key: string]: unknown;
}

export interface RedtailNote {
  id?: number;
  category_id?: number;
  category?: string;
  note_type?: number;
  note_type_description?: string;
  pinned?: boolean;
  draft?: boolean;
  body?: string;
  added_by?: number;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface RedtailNoteInput {
  category_id?: number;
  note_type?: number;
  pinned?: boolean;
  draft?: boolean;
  body: string;
  notify_user_id?: number;
  notify_team_id?: number;
  [key: string]: unknown;
}

export interface RedtailActivity {
  id?: number;
  category_id?: number;
  activity_code_id?: number;
  subject?: string;
  description?: string;
  location?: string;
  all_day?: boolean;
  start_date?: string;
  end_date?: string;
  importance?: number;
  priority?: number | null;
  percentdone?: number | null;
  share_with_client?: boolean;
  added_by?: number;
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface RedtailActivityInput {
  activity_code_id?: number;
  category_id?: number | null;
  subject: string;
  description?: string;
  location?: string;
  all_day?: boolean;
  start_date?: string;
  end_date?: string;
  importance?: number;
  share_with_client?: boolean;
  [key: string]: unknown;
}

export interface RedtailOpportunity {
  id?: number;
  source_id?: number;
  source?: string;
  stage_id?: number;
  stage?: string;
  name?: string;
  description?: string;
  opportunity_type?: number;
  opportunity_type_description?: string;
  assigned_to?: number | null;
  amount?: string;
  close_date?: string | null;
  next_step?: string;
  probability?: number;
  projected_revenue?: string;
  actual_revenue?: string;
  deleted?: boolean;
  linked_contacts?: Array<{ contact_id: number }>;
  [key: string]: unknown;
}

export interface RedtailOpportunityInput {
  source_id?: number;
  name: string;
  description?: string;
  opportunity_type?: number;
  stage_id?: number;
  assigned_to?: number | null;
  amount?: string;
  close_date?: string | null;
  next_step?: string;
  probability?: number;
  linked_contacts?: Array<{ contact_id: number }>;
  [key: string]: unknown;
}

export interface RedtailDatabaseUser {
  id?: number;
  default_database_id?: number;
  admin?: boolean;
  deny_access?: boolean;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export interface RedtailOpportunityStage {
  id?: number;
  code?: string;
  is_default?: boolean;
  deleted?: boolean;
  [key: string]: unknown;
}
