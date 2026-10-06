import type { Param } from "@w6w/types";
import { compact, jsonValue } from "./client.ts";

export const queryParam = (what: string): Param => ({
  key: "query",
  label: "Elasticsearch query",
  type: "json",
  hint:
    `An Elasticsearch 7.7 query object over the ${what} fields (term, terms, exists, bool, match, match_phrase, range, wildcard, prefix, match_all). No aggregations. Give this or SQL, not both.`,
  placeholder: '{"bool":{"must":[{"term":{"job_title_role":"engineering"}}]}}',
});

export const sqlParam = (table: string): Param => ({
  key: "sql",
  label: "SQL query",
  type: "text",
  hint:
    `SELECT * FROM ${table} WHERE ... (column selection and LIMIT are ignored; at most 20 LIKE wildcards). Give this or an Elasticsearch query, not both.`,
});

export const sizeParam: Param = {
  key: "size",
  label: "Page size",
  type: "number",
  default: 1,
  validation: { min: 1, max: 100, integer: true },
  hint:
    "Records per call, 1-100 (PDL's default is 1). You are charged one credit per record returned, so this caps the spend.",
};

export const scrollTokenParam: Param = {
  key: "scroll_token",
  label: "Scroll token",
  type: "string",
  hint:
    "The scroll_token from the previous response, with the same query, to fetch the next page. A null token or a 404 means the last page was read.",
};

/**
 * The POST body for a PDL search: exactly one of `query` / `sql`, a validated `size`, and any
 * other keys the caller names, all unset values dropped.
 */
export function searchBody(
  input: Record<string, unknown>,
  extra: readonly string[] = [],
): Record<string, unknown> {
  const query = jsonValue(input.query, "query");
  const sql = typeof input.sql === "string" && input.sql.trim() !== "" ? input.sql : undefined;
  if (query !== undefined && sql !== undefined) {
    throw new Error("Give an Elasticsearch query or a SQL query, not both.");
  }
  if (query === undefined && sql === undefined) {
    throw new Error("Give an Elasticsearch query or a SQL query.");
  }
  const size = input.size;
  if (size !== undefined && size !== null && size !== "") {
    const n = Number(size);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      throw new Error("size must be a whole number between 1 and 100.");
    }
  }
  const body: Record<string, unknown> = { query, sql, size, scroll_token: input.scroll_token };
  for (const k of extra) body[k] = k === "titlecase" ? (input[k] === true || undefined) : input[k];
  return compact(body);
}
