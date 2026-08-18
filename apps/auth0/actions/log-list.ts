import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";

/**
 * `GET /api/v2/logs` — the tenant log: every login, failure, token exchange and
 * administrative change.
 *
 * ## Two pagination models, and only one of them works past 1,000 entries
 *
 * Ordinary `page`/`per_page` paging is capped: Auth0 will not return results
 * beyond the first 1,000 of a query. **Checkpoint pagination** — passing the
 * `log_id` of the last entry seen as `from`, with `take` — has no such ceiling
 * and is the only way to read a log continuously.
 *
 * This action uses checkpoint pagination whenever `from` is given, which also
 * makes it the right shape for a recurring job: store the last `log_id`, pass
 * it next time, and never re-read or miss an entry. Sorting is fixed under
 * checkpoint paging, which is what makes that guarantee hold.
 *
 * ## The type codes are the point, and they are opaque
 *
 * Auth0's log `type` is a short code rather than a word: `s` is a successful
 * login, `f` a failed one, `fp` a failed password, `ss` a successful signup,
 * `sapi` a successful Management API operation, `limit_wc` a blocked account
 * from too many failures. A workflow watching for credential stuffing is
 * watching `fp` and `limit_wc`, and no amount of reading the entry's prose will
 * substitute for filtering on them.
 *
 * Retention is by plan, and short on lower tiers — a log-based workflow is
 * reading a window, not an archive.
 */
const action: ActionDefinition = {
  key: "log-list",
  type: "read",
  resource: "log",
  title: "List tenant logs",
  description:
    "Logins, failures and admin changes. Use checkpoint paging (`from` + `take`) for anything " +
    "recurring — ordinary paging stops at 1,000 entries.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      placeholder: 'type:"fp" AND date:[2026-08-01 TO 2026-08-18]',
      hint: "Lucene syntax. `type` codes are short: `s` success, `f` failure, `fp` failed " +
        "password, `ss` successful signup, `limit_wc` blocked account.",
    },
    {
      key: "from",
      label: "From Log ID",
      type: "string",
      default: "",
      hint: "Checkpoint paging: the `log_id` of the last entry you saw. Store it and pass it " +
        "next run to read continuously without gaps or repeats.",
    },
    {
      key: "take",
      label: "Take",
      type: "number",
      default: 50,
      hint: "How many entries. Auth0's maximum is 100 per request.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "date:-1",
      hint: "Ignored under checkpoint paging, where the order is fixed.",
    },
  ],
  output: [
    { key: "logs", type: "array", label: "Log entries" },
    { key: "lastLogId", type: "string", label: "Last log ID — pass as `from` next run" },
    { key: "count", type: "number", label: "Entries returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = String(p.from ?? "").trim();
    const take = Math.min(100, Math.max(1, Number(p.take ?? 50)));

    const logs = await new Auth0Client(ctx).request<Array<Record<string, unknown>>>("/logs", {
      query: from
        // Checkpoint paging: no 1,000-entry ceiling, and no gaps between runs.
        ? { from, take }
        : {
          q: String(p.query ?? "") || undefined,
          per_page: take,
          sort: String(p.sort ?? "") || undefined,
        },
    });

    const list = Array.isArray(logs) ? logs : [];
    const lastLogId = list.length > 0 ? String(list[list.length - 1]?.log_id ?? "") : undefined;
    return { logs: list, lastLogId, count: list.length };
  },
};

export default action;
