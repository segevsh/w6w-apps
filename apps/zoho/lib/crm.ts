/**
 * Shared helpers for Zoho CRM's per-module record endpoints
 * (`/crm/v6/{module}...`). Every standard and custom module — Leads,
 * Contacts, Deals, Accounts, Tasks, Notes — shares the same request/response
 * shape, so the payload assembly lives here once and the per-resource action
 * files (`actions/lead-*.ts`, `actions/contact-*.ts`, ...) stay thin wrappers
 * that only know their own module name and field set.
 */
import type { HookContext } from "@w6w/types";
import {
  fields as parseFields,
  moduleName,
  unwrapRecordResult,
  ZohoClient,
  type ZohoRecordResult,
} from "./client.ts";

export interface ZohoListInfo {
  per_page?: number;
  count?: number;
  page?: number;
  more_records?: boolean;
  next_page_token?: string;
  previous_page_token?: string;
}

export interface ZohoListResponse<T = Record<string, unknown>> {
  data: T[];
  info?: ZohoListInfo;
}

export interface CrmListInput {
  /** Comma-separated field API names. Zoho requires at least one. */
  fields: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  converted?: "true" | "false" | "both";
}

export function crmList(
  ctx: HookContext,
  module: string,
  input: CrmListInput,
): Promise<ZohoListResponse> {
  return new ZohoClient(ctx).request(`/${moduleName(module)}`, {
    query: {
      fields: input.fields,
      page: input.page,
      per_page: input.per_page,
      sort_by: input.sort_by,
      sort_order: input.sort_order,
      converted: input.converted,
    },
  });
}

export interface CrmGetInput {
  recordId: string;
  /** Comma-separated field API names. Zoho requires at least one. */
  fields: string;
}

export async function crmGet(
  ctx: HookContext,
  module: string,
  input: CrmGetInput,
): Promise<Record<string, unknown>> {
  const res = await new ZohoClient(ctx).request<ZohoListResponse>(
    `/${moduleName(module)}/${encodeURIComponent(input.recordId)}`,
    { query: { fields: input.fields } },
  );
  const record = res.data?.[0];
  if (!record) throw new Error(`Zoho CRM returned no record for id ${input.recordId}`);
  return record;
}

export interface CrmCreateInput {
  fields: unknown;
}

export function crmCreate(
  ctx: HookContext,
  module: string,
  input: CrmCreateInput,
): Promise<ZohoRecordResult> {
  return new ZohoClient(ctx)
    .request<{ data: ZohoRecordResult[] }>(`/${moduleName(module)}`, {
      method: "POST",
      body: { data: [parseFields(input.fields)] },
    })
    .then(unwrapRecordResult);
}

export interface CrmUpdateInput {
  recordId: string;
  fields: unknown;
}

export function crmUpdate(
  ctx: HookContext,
  module: string,
  input: CrmUpdateInput,
): Promise<ZohoRecordResult> {
  return new ZohoClient(ctx)
    .request<{ data: ZohoRecordResult[] }>(`/${moduleName(module)}`, {
      method: "PUT",
      body: { data: [{ id: input.recordId, ...parseFields(input.fields) }] },
    })
    .then(unwrapRecordResult);
}

export interface CrmDeleteInput {
  recordId: string;
}

export function crmDelete(
  ctx: HookContext,
  module: string,
  input: CrmDeleteInput,
): Promise<ZohoRecordResult> {
  return new ZohoClient(ctx)
    .request<{ data: ZohoRecordResult[] }>(`/${moduleName(module)}`, {
      method: "DELETE",
      query: { ids: input.recordId },
    })
    .then(unwrapRecordResult);
}

export interface CrmSearchInput {
  module: string;
  criteria?: string;
  email?: string;
  phone?: string;
  word?: string;
  page?: number;
  per_page?: number;
}

export function crmSearch(
  ctx: HookContext,
  input: CrmSearchInput,
): Promise<ZohoListResponse> {
  if (!input.criteria && !input.email && !input.phone && !input.word) {
    throw new Error("search requires one of `criteria`, `email`, `phone` or `word`.");
  }
  return new ZohoClient(ctx).request(`/${moduleName(input.module)}/search`, {
    query: {
      criteria: input.criteria,
      email: input.email,
      phone: input.phone,
      word: input.word,
      page: input.page,
      per_page: input.per_page,
    },
  });
}
