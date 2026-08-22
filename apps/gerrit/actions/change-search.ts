import type { ActionDefinition } from "@w6w/types";
import { csv, daysSince, GerritClient, query } from "../lib/client.ts";

/**
 * `GET /a/changes/` — Gerrit's query language, which is the good part.
 *
 * ## The query is the product
 *
 * `status:open owner:self`, `is:submittable`, `label:Code-Review=-2`,
 * `age:14d project:platform branch:main`. Gerrit's search is expressive enough
 * that most questions a workflow has about a review queue are one query, and
 * this action's job is to pass it through rather than reinvent it with
 * parameters.
 *
 * ## What comes back is a skeleton unless you ask for more
 *
 * By default a change carries its subject, status and ids — and *no* labels,
 * no reviewers, no revision. Those are `o=` options, and a workflow that
 * checks `change.labels` without asking for `LABELS` reads `undefined` and
 * concludes nobody has voted.
 *
 * This action requests the options its outputs need, and offers the expensive
 * ones separately. `MERGEABLE` in particular makes Gerrit compute a merge for
 * every result, which on a large query is slow enough to matter.
 *
 * ## `_more_changes` marks a truncated result
 *
 * Gerrit sets it on the **last** change of a page rather than at the top
 * level, which is easy to miss. Without noticing it, a workflow that queries
 * "all open changes" acts on the first 500 and believes that is all of them.
 */
const action: ActionDefinition = {
  key: "change-search",
  type: "search",
  resource: "change",
  title: "Search changes",
  description:
    "Gerrit's query language, passed through — `status:open owner:self`, `is:submittable`, " +
    "`label:Code-Review=-2`. A change comes back as a SKELETON unless options are requested, so " +
    "reading `labels` without asking for them looks like nobody has voted.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "status:open",
      placeholder: "status:open project:platform -is:wip",
      hint: "Gerrit's search syntax. `is:submittable`, `age:14d`, `label:Code-Review=+2`, " +
        "`owner:self` and so on.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "start", label: "Skip", type: "number", default: 0 },
    {
      key: "includeLabels",
      label: "Include label votes",
      type: "boolean",
      default: true,
      hint: "Without this, `labels` is absent and reads as nobody having voted.",
    },
    {
      key: "includeMergeable",
      label: "Compute mergeability",
      type: "boolean",
      default: false,
      hint: "Makes Gerrit attempt a merge for every result. Slow on a large query.",
    },
    {
      key: "extraOptions",
      label: "Extra options",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated `o=` values: CURRENT_REVISION, MESSAGES, DETAILED_LABELS, " +
        "SUBMIT_REQUIREMENTS, ALL_FILES.",
    },
  ],
  output: [
    { key: "changes", type: "array", label: "The changes" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "numbers", type: "array", label: "Change numbers — the safe identifier" },
    { key: "hasMore", type: "boolean", label: "Whether Gerrit truncated the result" },
    { key: "submittable", type: "array", label: "Ready to submit right now" },
    { key: "blocked", type: "array", label: "Carrying a -2, which no +2 overrides" },
    { key: "workInProgress", type: "array", label: "Explicitly not asking for review yet" },
    { key: "withUnresolvedComments", type: "array", label: "Someone is waiting on an answer" },
    { key: "oldestDays", type: "number", label: "Age of the least recently updated change" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    if (!q) {
      throw new Error(
        "`q` is required — `status:open` is the usual starting point, and Gerrit's query " +
          "language is where most of this API's value is",
      );
    }

    // A skeleton otherwise: labels, reviewers and revisions are all opt-in.
    const options = ["DETAILED_ACCOUNTS", "SUBMITTABLE"];
    if (p.includeLabels !== false) options.push("LABELS");
    if (p.includeMergeable === true) options.push("MERGEABLE");
    for (const extra of csv(p.extraOptions) ?? []) options.push(extra.toUpperCase());

    const url = new URLSearchParams();
    const params = query({
      q,
      n: Math.max(1, Math.min(500, Number(p.limit ?? 25))),
      S: Math.max(0, Number(p.start ?? 0)),
    });
    for (const [k, v] of Object.entries(params)) url.append(k, String(v));
    for (const option of options) url.append("o", option);

    const changes = await new GerritClient(ctx).request<
      Array<{
        id?: string;
        _number?: number;
        change_id?: string;
        project?: string;
        branch?: string;
        subject?: string;
        status?: string;
        submittable?: boolean;
        work_in_progress?: boolean;
        unresolved_comment_count?: number;
        updated?: string;
        labels?: Record<string, { blocking?: boolean; rejected?: unknown; approved?: unknown }>;
        _more_changes?: boolean;
      }>
    >(`/changes/?${url.toString()}`);

    const list = Array.isArray(changes) ? changes : [];
    const label = (change: { _number?: number; subject?: string }) =>
      `${change?._number ?? "?"}: ${change?.subject ?? ""}`;

    // Gerrit marks truncation on the LAST change, not at the top level.
    const hasMore = list.some((change) => change?._more_changes === true);
    if (hasMore) {
      ctx.log(
        "info",
        "Gerrit truncated this result and marked it on the last change — there are more matches " +
          "than came back, which is easy to miss and easy to act on wrongly",
        { count: list.length },
      );
    }

    // A -2 on any label blocks submission outright.
    const blocked = list.filter((change) =>
      Object.values(change?.labels ?? {}).some((value) => value?.rejected)
    );

    const ages = list
      .map((change) => daysSince(change?.updated))
      .filter((days): days is number => typeof days === "number");

    return {
      changes: list,
      count: list.length,
      numbers: list.map((change) => change?._number).filter(Boolean),
      hasMore,
      submittable: list.filter((change) => change?.submittable === true).map(label),
      blocked: blocked.map(label),
      workInProgress: list.filter((change) => change?.work_in_progress === true).map(label),
      withUnresolvedComments: list
        .filter((change) => Number(change?.unresolved_comment_count ?? 0) > 0)
        .map(label),
      oldestDays: ages.length ? Math.max(...ages) : undefined,
    };
  },
};

export default action;
