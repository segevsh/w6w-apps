/**
 * Shared helpers for Bigin's per-module record endpoints
 * (`/bigin/v2/{module_api_name}...`).
 *
 * Every module — Contacts, Accounts (the API name for Companies), Pipelines,
 * Tasks, and the modules this app deliberately does not expose — shares the
 * same request/response shape, so the payload assembly lives here once and the
 * per-resource action files stay thin wrappers that know only their own module
 * name and default field set.
 *
 * Verified 2026-09-22 against
 * https://www.bigin.com/developer/docs/apis/v2/{get,insert,update,delete,search}-records.html:
 *
 *   - the list envelope is `{ "data": [...], "info": {...} }`;
 *   - the single-record read answers the same `data` array with one entry;
 *   - insert/update/delete answer the per-record `data` result array;
 *   - **search accepts exactly one of `criteria`, `email`, `phone` or `word`**
 *     and, per the documented query-parameter list, no `page`/`per_page`
 *     (unlike the list endpoint) — so this app sends only what is documented.
 */
import type { HookContext } from "@w6w/types";
import {
  BiginClient,
  type BiginRecordResult,
  fields as parseFields,
  moduleName,
  unwrapRecordResult,
} from "./client.ts";

/** The `info` object Bigin returns alongside a list. */
export interface BiginListInfo {
  per_page?: number;
  count?: number;
  page?: number;
  more_records?: boolean;
  sort_by?: string;
  sort_order?: string;
  next_page_token?: string;
  previous_page_token?: string | null;
  page_token_expiry?: string;
}

export interface BiginListResponse<T = Record<string, unknown>> {
  data: T[];
  info?: BiginListInfo;
}

export interface ListInput {
  /** Comma-separated field API names. Bigin requires at least one, max 50. */
  fields: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  /** Cursor for paging past 2000 records, from a previous response's `info`. */
  page_token?: string;
  /** Custom-view id (from the Custom Views metadata API). */
  cvid?: string;
}

export function listRecords(
  ctx: HookContext,
  module: string,
  input: ListInput,
): Promise<BiginListResponse> {
  return new BiginClient(ctx).request(`/${moduleName(module)}`, {
    query: {
      fields: input.fields,
      page: input.page,
      per_page: input.per_page,
      sort_by: input.sort_by,
      sort_order: input.sort_order,
      page_token: input.page_token,
      cvid: input.cvid,
    },
  });
}

export interface GetInput {
  recordId: string;
  /** Optional field list; the single-record GET works without it. */
  fields?: string;
}

export async function getRecord(
  ctx: HookContext,
  module: string,
  input: GetInput,
): Promise<Record<string, unknown>> {
  const res = await new BiginClient(ctx).request<BiginListResponse>(
    `/${moduleName(module)}/${encodeURIComponent(input.recordId)}`,
    { query: { fields: input.fields } },
  );
  const record = res.data?.[0];
  if (!record) throw new Error(`Bigin returned no record for id ${input.recordId}`);
  return record;
}

export interface CreateInput {
  fields: unknown;
}

/**
 * `POST /{module}` with the record wrapped in a `data` array — Bigin's own
 * sample request body is `{"data":[{...}]}` (`insert-records.html`), the same
 * wrapping Zoho CRM uses. The page's note "send only one JSON object in the
 * input to insert a single record" describes the array's *length* for this
 * app's single-record case, not a bare unwrapped object: its companion note
 * reports `INVALID_DATA` with `{"expected_data_type":"jsonarray",
 * "api_name":"data"}` when the key is missing or not an array.
 */
export function createRecord(
  ctx: HookContext,
  module: string,
  input: CreateInput,
): Promise<BiginRecordResult> {
  return new BiginClient(ctx)
    .request<{ data: BiginRecordResult[] }>(`/${moduleName(module)}`, {
      method: "POST",
      body: { data: [parseFields(input.fields)] },
    })
    .then(unwrapRecordResult);
}

export interface UpdateInput {
  recordId: string;
  fields: unknown;
}

/**
 * `PUT /{module}/{record_id}`, documented alongside the collection form
 * `PUT /{module}` (which requires `id` inside each array entry). The path form
 * is the one this app uses — one record per call — and the body is still the
 * documented `{"data":[{...}]}` array, with the id included so the body matches
 * the documented sample whether or not the server reads it from the path.
 */
export function updateRecord(
  ctx: HookContext,
  module: string,
  input: UpdateInput,
): Promise<BiginRecordResult> {
  return new BiginClient(ctx)
    .request<{ data: BiginRecordResult[] }>(
      `/${moduleName(module)}/${encodeURIComponent(input.recordId)}`,
      {
        method: "PUT",
        body: { data: [{ id: input.recordId, ...parseFields(input.fields) }] },
      },
    )
    .then(unwrapRecordResult);
}

export interface DeleteInput {
  recordId: string;
}

/** `DELETE /{module}/{record_id}` — documented alongside the `ids=` collection form. */
export function deleteRecord(
  ctx: HookContext,
  module: string,
  input: DeleteInput,
): Promise<BiginRecordResult> {
  return new BiginClient(ctx)
    .request<{ data: BiginRecordResult[] }>(
      `/${moduleName(module)}/${encodeURIComponent(input.recordId)}`,
      { method: "DELETE" },
    )
    .then(unwrapRecordResult);
}

export interface SearchInput {
  module: string;
  criteria?: string;
  email?: string;
  phone?: string;
  word?: string;
}

/**
 * `GET /{module}/search`. The four selectors are alternatives — Bigin's own
 * endpoint list gives one URL per selector — so exactly one is sent, and
 * sending none is a caller error rather than a request the vendor has to
 * reject.
 *
 * `criteria` grammar (from `search-records.html`):
 * `(({field_api_name}:{comparator}:{value})AND/OR({field_api_name}:{comparator}:{value}))`,
 * with comparators `equals`, `not_equal`, `starts_with`, `in` for text-ish
 * fields and `equals`, `not_equal`, `greater_than`, `greater_equal`,
 * `less_than`, `less_equal`, `between`, `in` for date/number fields.
 */
export function searchRecords(
  ctx: HookContext,
  input: SearchInput,
): Promise<BiginListResponse> {
  const selectors = [input.criteria, input.email, input.phone, input.word].filter(
    (v) => typeof v === "string" && v.length > 0,
  );
  if (selectors.length !== 1) {
    throw new Error(
      "search requires exactly one of `criteria`, `email`, `phone` or `word`.",
    );
  }
  return new BiginClient(ctx).request(`/${moduleName(input.module)}/search`, {
    query: {
      criteria: input.criteria,
      email: input.email,
      phone: input.phone,
      word: input.word,
    },
  });
}
