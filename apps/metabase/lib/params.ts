/**
 * Shared param fragments and output shapes.
 *
 * Every enum reproduced here is transcribed from Metabase's own OpenAPI
 * document (`metabase/metabase`, `docs/api.json` — OpenAPI 3.1, 561 paths,
 * fetched 2026-08-03) or from the Clojure source it is generated from. None of
 * it is remembered, and none of it comes from a third-party integration
 * directory.
 */
import type { Option, OutputField, Param } from "@w6w/types";

// ------------------------------------------------------------------ params --

/**
 * `metabase.query-processor.schema.export-format` — the export formats the
 * query endpoints accept, verbatim from the schema's `enum`.
 *
 * The schema lists four: `csv`, `api`, `xlsx`, `json`. `api` is excluded here.
 * It is the *internal* name for the ordinary JSON API response — the one the
 * plain `/query` route already serves — and asking for it through the export
 * path would just be a slower way to get what `question-run` returns, minus the
 * query-result envelope this app relies on to detect a failed query.
 */
export const exportFormatOptions: Option[] = [
  { value: "csv", label: "CSV", description: "Comma-separated text." },
  {
    value: "json",
    label: "JSON",
    description: "A flat array of row objects, keyed by column display name.",
  },
  { value: "xlsx", label: "XLSX", description: "Excel workbook (binary)." },
];

/**
 * `f` on `GET /api/card` — the saved-question list filter, verbatim from the
 * endpoint's enum.
 *
 * `using_model`, `using_segment`, `table` and `database` all require the
 * companion `model_id` to be set; the hint says so, because sending them alone
 * is a 400 rather than a no-op.
 */
export const cardFilterOptions: Option[] = [
  { value: "all", label: "All", description: "Every question the credential can see." },
  { value: "mine", label: "Mine", description: "Created by the caller." },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "archived", label: "Archived" },
  { value: "table", label: "By table", description: "Needs Model ID = a table id." },
  { value: "database", label: "By database", description: "Needs Model ID = a database id." },
  { value: "using_model", label: "Using model", description: "Needs Model ID = a model id." },
  { value: "using_segment", label: "Using segment", description: "Needs Model ID = a segment id." },
];

/** `f` on `GET /api/dashboard` — verbatim from the endpoint's enum. */
export const dashboardFilterOptions: Option[] = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "archived", label: "Archived" },
];

/**
 * `models` on `GET /api/search` — the searchable entity types, verbatim from
 * the endpoint's enum.
 */
export const searchModelOptions: Option[] = [
  { value: "card", label: "Question" },
  { value: "dataset", label: "Model" },
  { value: "metric", label: "Metric" },
  { value: "measure", label: "Measure" },
  { value: "dashboard", label: "Dashboard" },
  { value: "collection", label: "Collection" },
  { value: "database", label: "Database" },
  { value: "table", label: "Table" },
  { value: "segment", label: "Segment" },
  { value: "action", label: "Action" },
  { value: "document", label: "Document" },
  { value: "transform", label: "Transform" },
  { value: "indexed-entity", label: "Indexed entity" },
];

/**
 * `models` on `GET /api/collection/{id}/items` — a DIFFERENT enum from the
 * search one above, which is why it is written out separately rather than
 * shared. Collection items can be a `pulse`, `snippet`, `timeline` or
 * `no_models`; they cannot be a `database`, `segment`, `action` or
 * `indexed-entity`. Both lists are verbatim from their own endpoint's schema.
 */
export const collectionItemModelOptions: Option[] = [
  { value: "card", label: "Question" },
  { value: "dataset", label: "Model" },
  { value: "metric", label: "Metric" },
  { value: "measure", label: "Measure" },
  { value: "dashboard", label: "Dashboard" },
  { value: "collection", label: "Sub-collection" },
  { value: "document", label: "Document" },
  { value: "transform", label: "Transform" },
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
  { value: "snippet", label: "Snippet" },
  { value: "pulse", label: "Pulse / subscription" },
  { value: "no_models", label: "None", description: "Return the envelope with no items." },
];

/** `sort_column` on `GET /api/collection/{id}/items`, verbatim from its enum. */
export const collectionSortOptions: Option[] = [
  { value: "name", label: "Name" },
  { value: "model", label: "Type" },
  { value: "last_edited_at", label: "Last edited at" },
  { value: "last_edited_by", label: "Last edited by" },
  { value: "description", label: "Description" },
];

/** `pinned_state` on `GET /api/collection/{id}/items`, verbatim from its enum. */
export const pinnedStateOptions: Option[] = [
  { value: "all", label: "All" },
  { value: "is_pinned", label: "Pinned only" },
  { value: "is_not_pinned", label: "Not pinned" },
];

/**
 * The `parameters` a query endpoint accepts.
 *
 * This is Metabase's filter-value mechanism, and it is a JSON array rather than
 * a map because each entry carries three parts: which parameter it targets
 * (`id` or `target`), what type it is, and the value. The shape the API expects
 * is, per `metabase.parameters.schema`:
 *
 *     [{ "type": "category", "value": ["Widget"],
 *        "target": ["dimension", ["template-tag", "cat"]] }]
 *
 * It is exposed as a raw `json` param rather than a generated form because the
 * legal `target` depends entirely on how the question was authored — a native
 * question uses `["template-tag", "<name>"]`, an MBQL one uses a field ref — and
 * no static form can know which. The card's own `parameters` array, returned by
 * `question-get`, is the reference for what to send.
 */
export const queryParametersParam: Param = {
  key: "parameters",
  label: "Parameters",
  type: "json",
  hint: "JSON array of Metabase parameter objects, e.g. " +
    '`[{"type":"category","value":["Widget"],"target":["dimension",["template-tag","cat"]]}]`. ' +
    "Read the question's own `parameters` array (via Get Question) to see what it accepts. " +
    "Leave empty to run the question with its saved defaults.",
};

/**
 * `ignore_cache` on the card query endpoints.
 *
 * Metabase caches question results when a caching policy is configured, and a
 * cached answer comes back with a `cached` timestamp instead of a fresh
 * `running_time`. A workflow that is polling for change wants the fresh read;
 * one that is rendering a digest does not. Defaulted to `false` because that is
 * the endpoint's own declared default (`{:default false}` in `card.clj`), and
 * silently diverging from a vendor default is how two callers end up disagreeing
 * about what "no options" means.
 */
export const ignoreCacheParam: Param = {
  key: "ignoreCache",
  label: "Bypass cache",
  type: "boolean",
  default: false,
  hint: "Force a fresh run even when a caching policy would have served a stored result.",
};

/** 0-based row offset, for the two endpoints that document one. */
export const offsetParam: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  hint: "0-based index of the first item to return.",
  validation: { integer: true, min: 0 },
};

/** Page size, for the two endpoints that document one. */
export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  hint: "Maximum number of items to return.",
  validation: { integer: true, min: 1 },
};

// ----------------------------------------------------------------- outputs --

/**
 * The query-result envelope, common to `POST /api/dataset`,
 * `POST /api/card/{id}/query` and the dashboard-card query.
 *
 * Declared from `metabase.query-processor.schema.query-result`, whose only
 * required members are `status` and `row_count`. `data.rows` is a **positional
 * array of arrays** — the column names live in `data.cols`, in the same order.
 * That is the single most surprising thing about consuming this API and is
 * called out in the labels, because a caller expecting `{column: value}` objects
 * gets nothing useful from `rows` and will conclude the query returned garbage.
 */
export const queryResultOutput: OutputField[] = [
  { key: "status", type: "string", label: "Status — `completed` (a `failed` query throws)" },
  { key: "row_count", type: "number", label: "Rows returned" },
  { key: "running_time", type: "number", label: "Execution time (ms)" },
  { key: "data", type: "object", label: "Result set" },
  { key: "data.rows", type: "array", label: "Rows — array of positional value arrays" },
  { key: "data.cols", type: "array", label: "Columns — same order as each row's values" },
  { key: "data.native_form", type: "object", label: "The SQL actually executed" },
  { key: "database_id", type: "number", label: "Database the query ran against" },
  { key: "started_at", type: "string", label: "Started at" },
  { key: "cached", type: "string", label: "Set when the result came from cache" },
  { key: "json_query", type: "object", label: "The query as Metabase normalised it" },
];

/** A saved question (`card`), as returned by `GET /api/card/{id}`. */
export const cardOutput: OutputField[] = [
  { key: "id", type: "number", label: "Question ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "type", type: "string", label: "Type — `question`, `model` or `metric`" },
  { key: "display", type: "string", label: "Visualisation type" },
  { key: "query_type", type: "string", label: "`native` or `query` (MBQL)" },
  { key: "dataset_query", type: "object", label: "The question's query definition" },
  { key: "parameters", type: "array", label: "Parameters this question accepts" },
  { key: "result_metadata", type: "array", label: "Column metadata from the last run" },
  { key: "collection_id", type: "number", label: "Collection ID (null = root)" },
  { key: "collection", type: "object", label: "Collection" },
  { key: "database_id", type: "number", label: "Database ID" },
  { key: "table_id", type: "number", label: "Table ID" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "creator_id", type: "number", label: "Creator user ID" },
  { key: "creator", type: "object", label: "Creator" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
  { key: "last_query_start", type: "string", label: "Last run at" },
  { key: "view_count", type: "number", label: "Views" },
  { key: "visualization_settings", type: "object", label: "Visualisation settings" },
];

/** A dashboard, as returned by `GET /api/dashboard/{id}`. */
export const dashboardOutput: OutputField[] = [
  { key: "id", type: "number", label: "Dashboard ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "collection_id", type: "number", label: "Collection ID (null = root)" },
  { key: "dashcards", type: "array", label: "Cards placed on the dashboard" },
  { key: "tabs", type: "array", label: "Dashboard tabs" },
  { key: "parameters", type: "array", label: "Dashboard filters" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "creator_id", type: "number", label: "Creator user ID" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
  { key: "view_count", type: "number", label: "Views" },
  { key: "width", type: "string", label: "Layout width" },
];

/** A collection, as returned by `GET /api/collection` and `POST /api/collection`. */
export const collectionOutput: OutputField[] = [
  { key: "id", type: "string", label: "Collection ID — an integer, or `root` / `trash`" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "slug", type: "string", label: "Slug" },
  { key: "location", type: "string", label: "Path of ancestor ids, e.g. `/3/7/`" },
  { key: "parent_id", type: "number", label: "Parent collection ID" },
  { key: "personal_owner_id", type: "number", label: "Owner, when this is a personal collection" },
  { key: "is_personal", type: "boolean", label: "Personal collection" },
  { key: "archived", type: "boolean", label: "Archived" },
  { key: "authority_level", type: "string", label: "`official`, or null" },
  { key: "can_write", type: "boolean", label: "Caller may write here" },
  { key: "created_at", type: "string", label: "Created at" },
];

/** The `{ data, total, limit, offset, models }` envelope returned by paged endpoints. */
export const pageOutput: OutputField[] = [
  { key: "data", type: "array", label: "Items" },
  { key: "total", type: "number", label: "Total matching items" },
  { key: "limit", type: "number", label: "Page size echoed back" },
  { key: "offset", type: "number", label: "Offset echoed back" },
  { key: "models", type: "array", label: "Entity types present in the result" },
];

/** A database connection registered in Metabase, as returned under `data`. */
export const databaseOutput: OutputField[] = [
  { key: "id", type: "number", label: "Database ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "engine", type: "string", label: "Driver — `postgres`, `bigquery-cloud-sdk`, …" },
  { key: "description", type: "string", label: "Description" },
  { key: "features", type: "array", label: "Driver capabilities" },
  { key: "timezone", type: "string", label: "Reported timezone" },
  { key: "is_sample", type: "boolean", label: "Metabase's bundled sample database" },
  { key: "is_audit", type: "boolean", label: "Internal analytics database" },
  { key: "auto_run_queries", type: "boolean", label: "Auto-run queries" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];
