import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient } from "../lib/client.ts";

/**
 * `GET /api/query/engage` — find **user profiles** by expression.
 *
 * The read side of the profile store, and the one query in this app that
 * returns people rather than numbers. It is how a workflow answers "which
 * accounts are on the pro plan and have not logged in for a month" and then
 * does something with the answer.
 *
 * Two ways to select, and they are alternatives:
 *
 *   - **`where`** — the same expression language as the event queries, over
 *     profile properties: `properties["$last_seen"] < "2026-07-01"`.
 *   - **`filter_by_cohort`** — a saved cohort, as `{"id": 12345}`. Cohorts
 *     encode logic somebody agreed on, so this is the better one when a cohort
 *     already exists; `cohort-list` has the ids.
 *
 * Paging is by `page` plus a `session_id` that Mixpanel returns on the first
 * response — **reusing the session id is what keeps the result set stable**
 * between pages, and this action does that automatically when asked for
 * everything.
 */
const action: ActionDefinition = {
  key: "profile-query",
  type: "search",
  resource: "profile",
  title: "Query user profiles",
  description:
    "Find people by property expression or by saved cohort. Paging reuses Mixpanel's session " +
    "id so the result set does not shift underneath it.",
  params: [
    {
      key: "where",
      label: "Filter Expression",
      type: "string",
      default: "",
      placeholder: 'properties["plan"] == "pro"',
      hint: "Over profile properties. Alternative to a cohort.",
    },
    {
      key: "cohortId",
      label: "Cohort ID",
      type: "string",
      default: "",
      hint: "From `cohort-list`. Preferred when the cohort already encodes the logic.",
    },
    {
      key: "outputProperties",
      label: "Properties To Return",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated. Empty returns every property, which on a large profile is a lot " +
        "of payload.",
    },
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
      hint: "Page through every match, reusing Mixpanel's session id.",
    },
    {
      key: "maxPages",
      label: "Maximum Pages",
      type: "number",
      default: 10,
      advanced: true,
      showIf: { "==": [{ var: "returnAll" }, true] },
      hint: "A ceiling, because each page is a request and the Query API allows 60 an hour.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Profiles" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "pages", type: "number", label: "Pages fetched" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const where = String(p.where ?? "").trim();
    const cohortId = String(p.cohortId ?? "").trim();
    if (where && cohortId) {
      throw new Error("give either `where` or `cohortId` — Mixpanel takes one selector");
    }

    const client = new MixpanelClient(ctx);
    const outputProperties = String(p.outputProperties ?? "").trim();
    const baseQuery = {
      where: where || undefined,
      filter_by_cohort: cohortId ? JSON.stringify({ id: Number(cohortId) }) : undefined,
      output_properties: outputProperties
        ? JSON.stringify(outputProperties.split(",").map((s) => s.trim()).filter(Boolean))
        : undefined,
    };

    const first = await client.request<
      { results?: unknown[]; total?: number; session_id?: string; page?: number }
    >("/api/query/engage", { query: baseQuery });

    const results = [...(first?.results ?? [])];
    let pages = 1;
    if (p.returnAll === true && first?.session_id) {
      const maxPages = Math.max(1, Number(p.maxPages ?? 10));
      let page = Number(first.page ?? 0);
      while (pages < maxPages && results.length < Number(first.total ?? 0)) {
        page += 1;
        // The session id is what pins the result set — without it each page is
        // computed afresh and rows can appear twice or not at all.
        const next = await client.request<{ results?: unknown[] }>("/api/query/engage", {
          query: { ...baseQuery, session_id: first.session_id, page },
        });
        const chunk = next?.results ?? [];
        if (chunk.length === 0) break;
        results.push(...chunk);
        pages += 1;
      }
    }

    return { results, total: first?.total, pages };
  },
};

export default action;
