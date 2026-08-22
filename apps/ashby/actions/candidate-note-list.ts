import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /candidate.listNotes` — the notes on one candidate.
 *
 * ## It takes a `syncToken` and ignores it
 *
 * Worth stating plainly, because it is exactly the kind of thing that produces
 * a silently-broken nightly job. Ashby's own schema says the parameter is
 * *"accepted for backward compatibility. This endpoint does not currently
 * support incremental synchronization."*
 *
 * So a workflow that passes last run's token here is not fetching "notes since
 * yesterday" — it is fetching **everything**, every time, while believing
 * otherwise. This action therefore does not offer the parameter at all, and
 * pages normally.
 *
 * The other oddity: an omitted `limit` returns up to **500** items, while an
 * explicit one is capped at 100. Asking for less gets you fewer pages.
 */
const action: ActionDefinition = {
  key: "candidate-note-list",
  type: "read",
  resource: "candidate",
  title: "List a candidate's notes",
  description:
    "The notes on one candidate. Ashby accepts a sync token here and IGNORES it — this endpoint " +
    "has no incremental sync — so the parameter is deliberately not offered.",
  params: [
    { key: "candidateId", label: "Candidate ID", type: "string", required: true, default: "" },
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: true,
      hint: "Page to the end. Most candidates have few notes.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      showIf: { "==": [{ var: "returnAll" }, false] },
      hint: "An explicit limit is capped at 100; omitting one lets Ashby return up to 500.",
    },
  ],
  output: [
    { key: "notes", type: "array", label: "Notes, newest first" },
    { key: "count", type: "number", label: "Notes returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const candidateId = String(p.candidateId ?? "").trim();
    if (!candidateId) throw new Error("`candidateId` is required");

    const returnAll = p.returnAll === undefined ? true : p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await new AshbyClient(ctx).pageAll(
      "candidate.listNotes",
      compact({ candidateId }),
      want,
    );
    return { notes: page.items, count: page.items.length };
  },
};

export default action;
