import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";
import { LIST_PARAMS, PAGE_PARAM } from "../lib/params.ts";

/**
 * `GET /pages/{page}/incidents` — and its two useful narrowings.
 *
 * **`unresolved` is the one a workflow wants.** It answers "is anything
 * currently wrong that we have told customers about", which is the question
 * behind "should I open a new incident or update the existing one" — and asking
 * it saves the duplicate-incident mistake that makes a status page look
 * unattended.
 *
 * `scheduled` lists maintenance windows, which live in the same collection but
 * are a different lifecycle, and are usually noise when looking for outages.
 *
 * Each incident carries its full `incident_updates` timeline, so reading one
 * incident is enough to reconstruct what customers were told and when.
 */
const action: ActionDefinition = {
  key: "incident-list",
  type: "read",
  resource: "incident",
  title: "List incidents",
  description:
    "Incidents on a page. `unresolved` answers 'is something already open' — the check that " +
    "prevents duplicate incidents for one outage.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      default: "unresolved",
      options: [
        { value: "unresolved", label: "Unresolved — currently open" },
        { value: "", label: "All incidents" },
        { value: "scheduled", label: "Scheduled maintenance only" },
      ],
    },
    PAGE_PARAM,
    ...LIST_PARAMS,
  ],
  output: [
    { key: "incidents", type: "array", label: "Incidents" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    const scope = String(p.scope ?? "unresolved");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const suffix = scope === "unresolved"
      ? "/unresolved"
      : scope === "scheduled"
      ? "/scheduled"
      : "";
    const incidents = await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/incidents${suffix}`,
      {},
      returnAll ? Infinity : limit,
    );
    return { incidents };
  },
};

export default action;
