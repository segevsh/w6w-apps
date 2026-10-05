import type { ActionDefinition } from "@w6w/types";
import { encodeId, normalizeCursor, RipplingClient } from "../lib/client.ts";
import { compact } from "../lib/client.ts";
import { customObjectApiNameParam } from "../lib/custom-objects.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  customObjectApiName: string;
  query?: string;
  limit?: number;
  cursor?: string;
}

/**
 * `POST .../records/query/` is a read in spite of the verb: the query goes in
 * the body. Its response differs from every other list in the API — the page
 * token comes back as a bare `cursor`, not as a `next_link` URL.
 */
const customObjectRecordQuery: ActionDefinition<Input> = {
  key: "custom-object-record-query",
  type: "search",
  resource: "custom-object-record",
  title: "Query Custom Object Records",
  description:
    "Search a custom object's records with a query string. Requires `custom-object-records.read` (or a read-write scope). Unlike the other lists, this one returns a bare `cursor` rather than a `next_link`.",
  params: [
    customObjectApiNameParam,
    {
      key: "query",
      label: "Query",
      type: "string",
      hint:
        "The query string that filters the results. Rippling's reference describes it only as " +
        '"the query string to filter results".',
    },
    limitParam,
    cursorParam,
  ],
  output: [
    { key: "results", type: "array", label: "Matching records" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null on the last)" },
  ],
  async execute(input, ctx) {
    const api = String(input.customObjectApiName ?? "").trim();
    if (!api) throw new Error("customObjectApiName is required");
    const body = await new RipplingClient(ctx).json<
      { results?: unknown[]; cursor?: string | null }
    >(`/custom-objects/${encodeId(api)}/records/query/`, {
      method: "POST",
      body: compact({
        query: input.query,
        limit: input.limit,
        cursor: normalizeCursor(input.cursor),
      }),
    });
    return { results: body?.results ?? [], nextCursor: body?.cursor ?? null };
  },
};

export default customObjectRecordQuery;
