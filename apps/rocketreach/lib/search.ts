import type { Param } from "@w6w/types";
import { compact, parseJsonParam, type RocketReachClient, toList } from "./client.ts";

/**
 * Person and company search share one request shape:
 * `{ start, page_size, query: { <filter>: [values] }, order_by }`.
 *
 * - `start` is 1-based, at most 10,000; `page_size` is 1-100.
 * - Every filter in `query` is an ARRAY of strings, even a single value.
 * - The curated params below are comma-separated text; the `query` JSON param
 *   covers the other ~50 documented filters (signals, intent, NAICS, ...) and is
 *   merged OVER the curated ones.
 * - The docs print the response as a bare array of results; the pagination block
 *   is not in the published schema, so `normalizeSearch` reads either shape.
 */
export const ORDER_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "score", label: "Score" },
];

const list = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "string",
  hint: `${hint} Comma-separated for several values (matches any).`,
});

export const PERSON_FILTERS: Param[] = [
  list("keyword", "Keyword", "Free-text match, e.g. `data enrichment`."),
  list("name", "Name", "e.g. `John Doe`."),
  list("current_title", "Current title", "e.g. `VP of Sales`."),
  list("employer", "Employer", "Company names, e.g. `RocketReach`."),
  list("company_domain", "Company domain", "e.g. `rocketreach.co`."),
  list("geo", "Location", "e.g. `North America`, `Boston`."),
  list("department", "Department", "e.g. `Engineering`, `Sales`."),
  list("management_levels", "Management level", "e.g. `Director`, `VP`, `C-Level`."),
  list("company_industry", "Company industry", "e.g. `Computer Software`."),
  list("company_size", "Company size", "Employee ranges, e.g. `51-200`."),
  list("skills", "Skills", "e.g. `Python, SQL`."),
  list("contact_method", "Has contact method", "`mobile`, `direct dial`, `personal email`, ..."),
  {
    key: "email_grade",
    label: "Minimum email grade",
    type: "select",
    options: [{ value: "A", label: "A" }, { value: "A-", label: "A-" }, {
      value: "B",
      label: "B",
    }],
    hint: "Only profiles whose email is at least this grade.",
  },
];

export const COMPANY_FILTERS: Param[] = [
  list("name", "Company name", "e.g. `RocketReach`."),
  list("domain", "Domain", "e.g. `rocketreach.co`."),
  list("industry", "Industry", "e.g. `Computer Software`."),
  list("geo", "Location", "e.g. `United States`."),
  list("employees", "Employees", "Employee ranges, e.g. `51-200`."),
  list("revenue", "Revenue", "Ranges, e.g. `10000000-50000000`."),
  list("techstack", "Tech stack", "e.g. `Salesforce`."),
  list("keyword", "Keyword", "Free-text match."),
];

export function searchParams(
  filters: Param[],
  defaultPageSize: number,
  kind: "people" | "companies",
): Param[] {
  return [
    ...filters,
    {
      key: "query",
      label: "Raw query",
      type: "json",
      hint: `JSON object of any documented ${kind} search filter, each value an ARRAY of ` +
        'strings, e.g. {"company_news_signal":["Funding"]}. Merged over the fields above.',
    },
    {
      key: "start",
      label: "Start",
      type: "number",
      default: 1,
      hint: "1-based index of the first result (max 10000). Pass the previous `nextStart`.",
      validation: { min: 1, max: 10000, integer: true },
    },
    {
      key: "page_size",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      hint: "Results per page, 1-100.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "order_by",
      label: "Order by",
      type: "select",
      options: ORDER_OPTIONS,
      default: "relevance",
    },
  ];
}

type Input = Record<string, unknown>;

export function searchBody(input: Input, filters: Param[]): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const f of filters) {
    const values = toList(input[f.key]);
    if (values.length > 0) query[f.key] = values;
  }
  const raw = parseJsonParam(input.query, "Raw query");
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Raw query must be a JSON object of filter -> array of values");
    }
    Object.assign(query, raw);
  }
  if (Object.keys(query).length === 0) {
    throw new Error("Give at least one search filter (a field or the raw query)");
  }
  const start = input.start === undefined || input.start === null ? 1 : Number(input.start);
  const pageSize = input.page_size === undefined || input.page_size === null
    ? undefined
    : Number(input.page_size);
  return compact({
    query,
    start,
    page_size: pageSize,
    order_by: typeof input.order_by === "string" ? input.order_by : undefined,
  });
}

export interface SearchPage<T> {
  items: T[];
  count: number;
  start: number;
  pageSize?: number;
  nextStart?: number;
  total?: number;
}

/** Reads a bare array, or `{ profiles | companies | results, pagination }`. */
export function normalizeSearch(
  body: unknown,
  start: number,
  pageSize: number | undefined,
): SearchPage<Record<string, unknown>> {
  const obj = (body && typeof body === "object" && !Array.isArray(body))
    ? body as Record<string, unknown>
    : {};
  const items =
    (Array.isArray(body)
      ? body
      : (["profiles", "companies", "results", "data"].map((k) => obj[k]).find(Array.isArray)) ?? [])
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const pagination = (obj.pagination ?? {}) as Record<string, unknown>;
  const total = typeof pagination.total === "number" ? pagination.total : undefined;
  let nextStart = typeof pagination.next === "number" ? pagination.next : undefined;
  if (nextStart === undefined && pageSize !== undefined && items.length >= pageSize) {
    nextStart = start + items.length;
  }
  if (nextStart !== undefined && total !== undefined && nextStart > total) nextStart = undefined;
  if (nextStart !== undefined && nextStart > 10000) nextStart = undefined;
  return { items, count: items.length, start, pageSize, nextStart, total };
}

export async function runSearch(
  client: RocketReachClient,
  path: string,
  input: Input,
  filters: Param[],
): Promise<SearchPage<Record<string, unknown>>> {
  const body = searchBody(input, filters);
  const { body: res } = await client.request(path, { method: "POST", body });
  return normalizeSearch(res, body.start as number, body.page_size as number | undefined);
}
