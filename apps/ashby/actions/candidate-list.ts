import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /candidate.list` — walk every candidate, or only what changed.
 *
 * ## The sync token is the whole point, and it has a catch
 *
 * Passing last run's `syncToken` returns only the candidates modified since,
 * which turns a nightly export of an entire ATS into a handful of records.
 *
 * **Ashby sends the token on the last page only.** So a run that stops early —
 * because a limit was reached, or the page ceiling hit — comes back with no
 * token, and the next run has no choice but to sync everything again. That is
 * not a bug to hide: this action returns the token when the walk genuinely
 * finished and `undefined` when it did not, and `moreDataAvailable` says which.
 *
 * For a one-off lookup use `candidate-search` instead; this endpoint exists to
 * move the whole collection.
 */
const action: ActionDefinition = {
  key: "candidate-list",
  type: "read",
  resource: "candidate",
  title: "List candidates",
  description:
    "Walk every candidate, or — with a sync token — only those changed since the last run. The " +
    "token arrives on the LAST page, so a truncated run does not get one.",
  params: [
    {
      key: "createdAfter",
      label: "Created After",
      type: "datetime",
      default: "",
      hint: "Ashby wants Unix milliseconds; a date is converted for you.",
    },
    { key: "createdBefore", label: "Created Before", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "candidates", type: "array", label: "Candidates" },
    { key: "count", type: "number", label: "Candidates returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
    { key: "moreDataAvailable", type: "boolean", label: "The walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "candidate.list",
      compact({
        syncToken: p.syncToken,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
        createdBefore: epochMillis(p.createdBefore, "createdBefore"),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Ashby candidates", {
      count: page.items.length,
      gotSyncToken: page.syncToken !== undefined,
    });
    return {
      candidates: page.items,
      count: page.items.length,
      syncToken: page.syncToken,
      moreDataAvailable: page.moreDataAvailable,
    };
  },
};

export default action;
