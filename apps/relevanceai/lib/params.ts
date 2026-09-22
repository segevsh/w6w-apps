import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Relevance AI actions.
 *
 * Field names, enums and ceilings here are copied from the vendor's live
 * OpenAPI document (fetched 2026-09-22 from
 * `https://api-f1db6c.stack.tryrelevance.com/latest/openapi_schema.json`), not
 * inferred. Where the vendor attaches a constraint — `agent_id` and `studio_id`
 * are `maxLength: 240` with pattern `^[a-zd._-]+$`, `query` is `maxLength: 100`,
 * `page_size` accepts an integer and no more — the hint says so.
 *
 * The vendor's own user-facing naming is "Tool" for what the API calls a
 * `studio` (`get-started/core-concepts/tools.mdx`), so every label here says
 * Tool while every path and body field keeps the API's own spelling.
 */

/** The vendor's own cap on a name search: `query` is `maxLength: 100` on every list input. */
export const MAX_QUERY_LENGTH = 100;

export const agentIdParam: Param = {
  key: "agentId",
  label: "Agent ID",
  type: "string",
  required: true,
  placeholder: "a1b2c3d4e5f6",
  hint: "From the agent's URL in Relevance AI, or the `_id`/`agent_id` of a List Agents " +
    "result. At most 240 characters, `[a-z0-9._-]` only.",
};

export const toolIdParam: Param = {
  key: "toolId",
  label: "Tool ID",
  type: "string",
  required: true,
  placeholder: "a1b2c3d4e5f6",
  hint: "The id of the tool ('studio' in the API) from Relevance AI, or the `studio_id` of a " +
    "List Tools result. At most 240 characters, `[a-z0-9._-]` only.",
};

export const jobIdParam: Param = {
  key: "jobId",
  label: "Job ID",
  type: "string",
  required: true,
  hint: "The `job_id` returned by Trigger Tool (Async).",
};

/**
 * `version` on the two get endpoints.
 *
 * The vendor's description is the same on both: "Version of the agent to run.
 * Can be 'active', 'draft', or a specific version_id" — three accepted forms, so
 * this stays a free string rather than a `select` that could not express a
 * version id.
 */
export const versionParam: Param = {
  key: "version",
  label: "Version",
  type: "string",
  hint: "`active`, `draft`, or a specific version id. Defaults to the agent's active version.",
};

/** The same three forms, on the tool endpoints, where the vendor calls the field `tool_version`. */
export const toolVersionParam: Param = {
  key: "toolVersion",
  label: "Tool version",
  type: "string",
  hint: "`active`, `draft`, or a specific version id. Defaults to the tool's active version.",
};

/**
 * How long the vendor is allowed to spend on one job.
 *
 * The enum is the schema's own, verbatim, and its description explains the
 * difference: `"hours"` routes the job to a dedicated worker tier with a
 * concurrency of 1 and slower autoscaling, while the two `seconds` members keep
 * it inside the request's own budget.
 */
export const maxJobDurationParam: Param = {
  key: "maxJobDuration",
  label: "Max job duration",
  type: "select",
  options: [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours — dedicated worker tier, concurrency 1" },
    { value: "synchronous_seconds", label: "Synchronous seconds" },
    { value: "background_seconds", label: "Background seconds" },
  ],
  hint: "Execution strategy for the job. Leave empty to use the tool's own default.",
};

/** The tool's own input payload — the tool defines its shape, not this app. */
export const toolParamsParam: Param = {
  key: "params",
  label: "Tool parameters",
  type: "json",
  hint: "The tool's own input parameters, passed through verbatim. The accepted shape is the " +
    "tool's own parameter schema — see it on the tool's page in Relevance AI, or in the " +
    "`params` of a Get Tool result.",
};

/** `query` — a name search, and the vendor caps it at 100 characters. */
export const queryParam: Param = {
  key: "query",
  label: "Search",
  type: "string",
  placeholder: "support triage",
  validation: { maxLength: MAX_QUERY_LENGTH },
  hint: `Name search, at most ${MAX_QUERY_LENGTH} characters (the API's own cap).`,
};

/**
 * The vendor's own filter DSL, exposed as JSON rather than regenerated as a form.
 *
 * The schema's filter object has five members — `field`, `filter_type` (an
 * eleven-member enum: `exact_match`, `exists`, `ilike`, `regexp`, `ids`, `date`,
 * `numeric`, `or`, `and`, `size`, `array_object_match`), `condition`,
 * `condition_value` and `case_insensitive` — and the `or`/`and` members nest
 * other filters, which a flat form cannot express.
 */
export const filtersParam: Param = {
  key: "filters",
  label: "Filters",
  type: "json",
  hint: "An array of the API's own filter objects, e.g. " +
    '`[{"field": "insert_date_", "filter_type": "date", "condition": ">", ' +
    '"condition_value": "2026-01-01"}]`. Left empty, nothing is filtered.',
};

/** `sort` — an array of field names or `{ field: "asc" | "desc" }` objects. */
export const sortParam: Param = {
  key: "sort",
  label: "Sort",
  type: "json",
  hint: 'An array of field names, or of one-key objects, e.g. `["-update_date_"]` or ' +
    '`[{"update_date_": "desc"}]`.',
};

/**
/**
 * `page_size` on its own — the async poll takes a size but no page number.
 *
 * **The prefilled size is this app's choice, not the vendor's.** The schema
 * declares `page_size` with no default at all, so leaving it empty hands the
 * page size to the server; a workflow step that silently receives a thousand
 * rows is a footgun rather than a convenience. Raise it deliberately.
 */
export function pageSizeParam(defaultPageSize = 20): Param {
  return {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: defaultPageSize,
    validation: { integer: true, min: 1 },
    hint: "Rows per page. The API documents no default, so this app prefills a small page " +
      "instead of letting the server decide.",
  };
}

/** The vendor's `page` / `page_size` pair, shared by the three list endpoints. */
export function paginationParams(defaultPageSize = 20): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "1-based page number. Defaults to the first page.",
    },
    pageSizeParam(defaultPageSize),
  ];
}

/** `after_message_id`, on the async poll — a cursor into a job's update stream. */
export const afterMessageIdParam: Param = {
  key: "afterMessageId",
  label: "After message id",
  type: "number",
  validation: { integer: true, min: 0 },
  hint: "Return only updates after this `last_message_id`, to fetch just what is new since the " +
    "previous poll. Leave empty for everything the job has emitted.",
};
