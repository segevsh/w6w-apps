import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**, because the meaningful limit
 * is not a rate.
 *
 * Neither ClickHouse plane publishes a rate-limit header. Probed 2026-08-19:
 * the control plane returns none, and the query interface returns
 * `X-ClickHouse-Summary` — which is the **cost of the query just run**, not
 * headroom against anything.
 *
 * What constrains a ClickHouse service is not requests per second. It is:
 *
 * - **Memory.** A query that exceeds `max_memory_usage` is killed with
 *   `MEMORY_LIMIT_EXCEEDED`, and how close it came is in that same summary —
 *   per query, after the fact.
 * - **Concurrent queries**, against `max_concurrent_queries`.
 * - **Parts.** Inserts creating parts faster than merges combine them ends in
 *   `TOO_MANY_PARTS` and a service that refuses writes. `table-list` reports
 *   the part count, which is the number that actually predicts trouble, and it
 *   is per table rather than per account.
 *
 * A single headroom figure would describe none of those. The per-query cost
 * that `query-run` returns is the honest version of this question, and it comes
 * back with every query rather than on a schedule.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Not checkable, and the question is the wrong one. ClickHouse is constrained by MEMORY, " +
    "concurrency and PART COUNT rather than by request rate — `query-run` returns what each " +
    "query actually cost, and `table-list` reports the part counts that predict a service " +
    "refusing writes.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason:
      "Neither ClickHouse plane publishes a rate-limit header — verified 2026-08-19. The query " +
      "interface returns `X-ClickHouse-Summary`, which is the cost of the query just run rather " +
      "than headroom against a budget. The constraints that matter here are not rates: a query " +
      "that exceeds max_memory_usage is killed with MEMORY_LIMIT_EXCEEDED, concurrency is capped " +
      "by max_concurrent_queries, and inserts outrunning merges end in TOO_MANY_PARTS and a " +
      "service that refuses writes. None of those is an account-level number. `query-run` " +
      "returns rows scanned, bytes read and memory used for every query, and `table-list` " +
      "reports the per-table part count — which is the figure that actually predicts trouble.",
  },
};

export default check;
