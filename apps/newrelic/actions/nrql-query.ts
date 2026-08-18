import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * Run NRQL — the reason most people reach for this API at all.
 *
 * ```graphql
 * { actor { account(id: N) { nrql(query: "…") { results metadata { … } } } } }
 * ```
 *
 * ## NRQL looks like SQL and is not
 *
 * The differences that catch people, in the order they catch them:
 *
 * - **There is a default time window, and it is one hour.** A query with no
 *   `SINCE` clause returns the last sixty minutes, silently. "Why does my
 *   daily total keep changing" is nearly always this.
 * - **There is a default `LIMIT`, and it is 100.** Not an error, not a cursor —
 *   just the first hundred rows. `LIMIT MAX` raises it to the ceiling for the
 *   query type.
 * - **`FACET`, not `GROUP BY`.** And a faceted result is a different shape:
 *   the facet value appears in `facet` rather than as a column.
 * - **No joins.** Correlating two event types means two queries.
 * - **Data ages out by type.** `Transaction` events are retained for days,
 *   `Metric` for months. A query over a window longer than the retention
 *   returns fewer rows rather than an error.
 *
 * ## `metadata` is where the truth about the answer is
 *
 * It reports the time window actually used, the event types actually read, and
 * `messages` — which is where NRQL puts warnings such as having sampled the
 * data or truncated the result. A result set with a message attached is not the
 * same as one without, and nothing else says so.
 */
const action: ActionDefinition = {
  key: "nrql-query",
  type: "search",
  resource: "nrql",
  title: "Run an NRQL query",
  description:
    "Query New Relic's data with NRQL. Note the two silent defaults: no SINCE means the last " +
    "HOUR, and no LIMIT means the first 100 rows.",
  params: [
    {
      key: "query",
      label: "NRQL",
      type: "text",
      required: true,
      default: "",
      placeholder: "SELECT count(*) FROM Transaction FACET name SINCE 1 hour ago",
      hint: "Add an explicit SINCE and LIMIT unless you mean the defaults.",
    },
    ACCOUNT_PARAM,
    {
      key: "timeout",
      label: "Timeout (s)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Up to 120. A long aggregate over a wide window will hit the default before it " +
        "finishes, and the error says so.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "The rows" },
    { key: "count", type: "number", label: "Rows returned" },
    { key: "capped", type: "boolean", label: "Exactly at a limit — there may be more" },
    { key: "messages", type: "array", label: "NRQL's own warnings, e.g. sampling" },
    { key: "eventTypes", type: "array", label: "What the query actually read" },
    { key: "timeWindow", type: "object", label: "The window actually used" },
    { key: "facets", type: "array", label: "Facet keys, when the query faceted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const nrql = String(p.query ?? "").trim();
    if (!nrql) throw new Error("`query` is required");

    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);
    const timeout = Number(p.timeout ?? 0);

    const data = await client.gql<{
      actor?: {
        account?: {
          nrql?: {
            results?: unknown[];
            metadata?: {
              eventTypes?: string[];
              facets?: string[];
              messages?: string[];
              timeWindow?: { begin?: number; end?: number };
            };
          };
        };
      };
    }>(
      `query($accountId: Int!, $nrql: Nrql!, $timeout: Seconds) {
        actor {
          account(id: $accountId) {
            nrql(query: $nrql, timeout: $timeout) {
              results
              metadata { eventTypes facets messages timeWindow { begin end } }
            }
          }
        }
      }`,
      { accountId: account, nrql, timeout: timeout > 0 ? Math.min(120, timeout) : null },
    );

    const nrqlResult = data?.actor?.account?.nrql;
    const results = nrqlResult?.results ?? [];
    const metadata = nrqlResult?.metadata ?? {};

    // 100 and 2000 are NRQL's defaults and ceilings; landing exactly on one is
    // the only signal that the answer was cut short.
    const capped = results.length === 100 || results.length === 1000 ||
      results.length === 2000;

    ctx.log("info", "ran an NRQL query", {
      accountId: account,
      count: results.length,
      capped,
      messages: (metadata.messages ?? []).length,
    });

    return {
      results,
      count: results.length,
      capped,
      messages: metadata.messages ?? [],
      eventTypes: metadata.eventTypes ?? [],
      timeWindow: metadata.timeWindow,
      facets: metadata.facets ?? [],
    };
  },
};

export default action;
