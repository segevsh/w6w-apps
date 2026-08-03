/**
 * Params and vocabularies shared across Tally's endpoints.
 *
 * Every enum here is copied from the vendor's OpenAPI document
 * (`https://developers.tally.so/api-reference/openapi.json`, fetched
 * 2026-08-03) rather than inferred — including the deliberately narrow ones
 * (`EventType` really does have exactly one member today).
 *
 * Pagination bounds differ per endpoint and are NOT unified: `/forms` and
 * `/forms/{id}/submissions` cap `limit` at 500, `/webhooks` caps it at 100, and
 * `/workspaces`, `/webhooks/{id}/events` and `/organizations/{id}/invites`
 * document no `limit` at all. `limitParam()` takes the ceiling so each action
 * advertises its own real bound.
 */
import type { Param } from "@w6w/types";

export interface PageInput {
  page?: number;
}

export interface PageLimitInput extends PageInput {
  limit?: number;
}

/** `page` — documented on every paginated collection endpoint. */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint:
    "1-based page number. Check `hasMore` on the response to decide whether to fetch the next one.",
  validation: { min: 1, integer: true },
};

/** `limit`, with the ceiling the specific endpoint documents. */
export function limitParam(max: number, defaultHint?: string): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: `Items per page (1–${max}).${defaultHint ? ` ${defaultHint}` : ""}`,
    validation: { min: 1, max, integer: true },
  };
}

/** `FormStatus` — the form lifecycle vocabulary. */
export const FORM_STATUSES = ["BLANK", "DRAFT", "PUBLISHED", "DELETED"] as const;

export const formStatusOptions = FORM_STATUSES.map((value) => ({ value, label: value }));

/** `EventType` — webhook subscription vocabulary. One member, as published. */
export const EVENT_TYPES = ["FORM_RESPONSE"] as const;

export const eventTypeOptions = EVENT_TYPES.map((value) => ({ value, label: value }));

/** The `filter` query param on `GET /forms/{id}/submissions`. */
export const SUBMISSION_FILTERS = ["all", "completed", "partial"] as const;

export const submissionFilterOptions = SUBMISSION_FILTERS.map((value) => ({ value, label: value }));

/** The `period` query param, required on all five analytics endpoints. */
export const ANALYTICS_PERIODS = [
  "today",
  "yesterday",
  "24h",
  "7d",
  "30d",
  "3m",
  "6m",
  "12m",
  "all",
] as const;

export const analyticsPeriodOptions = ANALYTICS_PERIODS.map((value) => ({ value, label: value }));

/** `period` is `required: true` in the OpenAPI for every analytics endpoint. */
export const periodParam: Param = {
  key: "period",
  label: "Period",
  type: "select",
  required: true,
  default: "30d",
  options: analyticsPeriodOptions,
  hint: "Reporting window.",
};

/** The `formId` path param, reused by every form-scoped action. */
export const formIdParam: Param = {
  key: "formId",
  label: "Form ID",
  type: "string",
  required: true,
  hint: "Get IDs from Get Many Forms.",
};

/** The `workspaceId` path param. */
export const workspaceIdParam: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  required: true,
  hint: "Get IDs from Get Many Workspaces.",
};

/** The `organizationId` path param — read it off Get Current User. */
export const organizationIdParam: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  required: true,
  hint: "The `organizationId` field on Get Current User.",
};

/** The `output` block the `items`-shaped paginated list actions declare. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Results" },
  { key: "page", type: "number" as const, label: "Current page" },
  { key: "limit", type: "number" as const, label: "Items per page" },
  { key: "total", type: "number" as const, label: "Total items" },
  { key: "hasMore", type: "boolean" as const, label: "More pages available" },
];
