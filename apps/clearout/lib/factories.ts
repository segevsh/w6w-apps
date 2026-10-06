import type { ActionDefinition, Param } from "@w6w/types";
import { ClearoutClient, compact } from "./client.ts";

/**
 * The bulk-list lifecycle is the same shape for Email Verifier and Email Finder
 * (`/email_verify/*` + `/download/result` vs `/email_finder/*`), so those actions are built
 * here from the vendor's paths. Paths verified 2026-10-06 against the OpenAPI documents.
 */
export const LIST_ID: Param = {
  key: "listId",
  label: "List ID",
  type: "string",
  required: true,
  hint: "The `list_id` returned when the bulk list was uploaded.",
};

interface ListIdInput {
  listId: string;
}

const need = (value: unknown, name: string): string => {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
};

export function progressAction(
  key: string,
  title: string,
  description: string,
  path: string,
  percentKey: "percentile" | "percentage",
): ActionDefinition<ListIdInput> {
  return {
    key,
    type: "read",
    resource: "bulk-list",
    title,
    description,
    params: [LIST_ID],
    output: [
      { key: "progressStatus", type: "string", label: "Progress status as the vendor reports it" },
      { key: "percent", type: "number", label: "Percent complete" },
    ],
    async execute(input, ctx) {
      const { data } = await new ClearoutClient(ctx).request(path, {
        query: { list_id: need(input.listId, "listId") },
      });
      const d = (data ?? {}) as Record<string, unknown>;
      return { progressStatus: d.progress_status, percent: d[percentKey] };
    },
  };
}

export function downloadAction(
  key: string,
  title: string,
  description: string,
  path: string,
): ActionDefinition<ListIdInput> {
  return {
    key,
    type: "perform",
    idempotent: true,
    resource: "bulk-list",
    title,
    description,
    params: [LIST_ID],
    output: [{ key: "url", type: "string", label: "Temporary result file download URL" }],
    async execute(input, ctx) {
      const { data } = await new ClearoutClient(ctx).request(path, {
        method: "POST",
        body: { list_id: need(input.listId, "listId") },
      });
      return { url: (data as { url?: string } | undefined)?.url };
    },
  };
}

const LIST_ECHO = [
  { key: "name", type: "string", label: "List name" },
  { key: "source", type: "string", label: "List source" },
  { key: "createdOn", type: "string", label: "Created on" },
] as const;

export function cancelAction(
  key: string,
  title: string,
  description: string,
  path: string,
): ActionDefinition<ListIdInput> {
  return {
    key,
    type: "perform",
    idempotent: false,
    resource: "bulk-list",
    title,
    description,
    params: [LIST_ID],
    output: [...LIST_ECHO],
    async execute(input, ctx) {
      const { data } = await new ClearoutClient(ctx).request(path, {
        method: "POST",
        body: { list_id: need(input.listId, "listId") },
      });
      const d = (data ?? {}) as Record<string, unknown>;
      return { name: d.name, source: d.source, createdOn: d.created_on };
    },
  };
}

export function removeAction(
  key: string,
  title: string,
  description: string,
  path: string,
): ActionDefinition<ListIdInput & { ignoreResult?: boolean }> {
  return {
    key,
    type: "perform",
    idempotent: false,
    resource: "bulk-list",
    title,
    description,
    params: [
      LIST_ID,
      {
        key: "ignoreResult",
        label: "Remove even if a download is in progress",
        type: "boolean",
        hint:
          "The vendor denies removal while a result download is in progress unless this is set.",
      },
    ],
    output: [...LIST_ECHO],
    async execute(input, ctx) {
      const { data } = await new ClearoutClient(ctx).request(path, {
        method: "POST",
        body: compact({
          list_id: need(input.listId, "listId"),
          ignore_result: input.ignoreResult ? true : undefined,
        }),
      });
      const d = (data ?? {}) as Record<string, unknown>;
      return { name: d.name, source: d.source, createdOn: d.created_on };
    },
  };
}

const DATE_RANGES = [
  "ps_today",
  "ps_yesterday",
  "ps_last_24_hours",
  "ps_this_week_mon_today",
  "ps_last_7_days_including_today",
  "ps_last_week_mon_sun",
  "ps_this_month",
  "ps_last_30_days",
];

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

interface ListInput {
  limit?: number;
  startAfter?: string;
  dateRange?: string;
  status?: string;
  type?: string;
}

export function listListsAction(
  key: string,
  title: string,
  description: string,
  path: string,
  statusFilter: { field: string; values: string[] },
  withType: boolean,
): ActionDefinition<ListInput> {
  const params: Param[] = [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { min: 1, max: 100, integer: true },
      hint: "Lists per page (1-100).",
    },
    {
      key: "startAfter",
      label: "Cursor",
      type: "string",
      hint: "`nextCursor` from the previous page. Leave empty for the first page.",
    },
    {
      key: "dateRange",
      label: "Created within",
      type: "select",
      options: opts(DATE_RANGES),
      hint: "The vendor defaults to the last 7 days when this is not set.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: opts(statusFilter.values),
    },
  ];
  if (withType) {
    params.push({
      key: "type",
      label: "Source",
      type: "string",
      hint: "Source type, e.g. upload, hubspot, mailchimp, apollo (the vendor's enum).",
    });
  }
  return {
    key,
    type: "search",
    resource: "bulk-list",
    title,
    description,
    params,
    output: [
      { key: "lists", type: "array", label: "Lists (vendor fields as returned)" },
      { key: "hasMore", type: "boolean", label: "More pages available" },
      { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    ],
    async execute(input, ctx) {
      const filter = compact({
        date_range: input.dateRange,
        [statusFilter.field]: input.status,
        type: withType ? input.type : undefined,
      });
      const { body } = await new ClearoutClient(ctx).request(path, {
        method: "POST",
        body: {
          ...compact({ limit: input.limit }),
          // The vendor says to pass null (not omit it) for the first page.
          start_after: input.startAfter || null,
          ...(Object.keys(filter).length ? { filter } : {}),
        },
      });
      const b = (body ?? {}) as {
        data?: unknown[];
        page_info?: { has_more?: boolean; last_cursor?: string | null };
      };
      return {
        lists: b.data ?? [],
        hasMore: b.page_info?.has_more ?? false,
        nextCursor: b.page_info?.last_cursor ?? null,
      };
    },
  };
}
