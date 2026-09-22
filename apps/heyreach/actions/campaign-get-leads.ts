import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { campaignIdParam, paginationParams } from "../lib/params.ts";

interface Input {
  campaignId: number;
  timeFrom?: string;
  timeTo?: string;
  timeFilter?: string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/campaign/GetLeadsFromCampaign` — the leads a campaign is
 * working.
 *
 * ## The body comes from the operation's prose, not its schema
 *
 * The document's `requestBody` here is a bare `{"type":"string"}` — a generator
 * artifact — but its `description` documents every body parameter
 * (`campaignId`, `offset`, `limit`, `timeFrom`, `timeTo`, `timeFilter`) and the
 * 200 schema is fully specified, so the fields below are the document's.
 *
 * ## "Lead Analytics" shows pending leads, not all of them
 *
 * The document is unusually blunt about this: this operation surfaces the
 * **Pending** leads that are about to execute actions, and says more pending
 * leads may sit in the source list waiting to be inserted. So an empty page is
 * not "the campaign has no leads" — it is "nothing is queued right now".
 *
 * ## `timeFilter` is the field that makes the window mean something
 *
 * `timeFrom`/`timeTo` alone filter nothing: `timeFilter` chooses which timestamp
 * they apply to — `CreationTime`, `LastActionTakenTime`, `FailedTime`,
 * `LastActionTakenOrFailedTime` or `Everywhere` (the default when omitted).
 * Only the last-action and failed windows are how a workflow finds "who did
 * nothing since Tuesday" or "who failed".
 */
const action: ActionDefinition<Input> = {
  key: "campaign-get-leads",
  type: "search",
  resource: "campaign",
  title: "Get Leads from Campaign",
  description:
    "List the leads queued in a campaign, with their per-lead campaign, connection and message " +
    "status (POST /api/public/campaign/GetLeadsFromCampaign).",
  params: [
    campaignIdParam,
    {
      key: "timeFilter",
      label: "Time filter applies to",
      type: "select",
      options: [
        { value: "CreationTime", label: "When the lead was created" },
        { value: "LastActionTakenTime", label: "When the lead last took an action" },
        { value: "FailedTime", label: "When the lead failed" },
        { value: "LastActionTakenOrFailedTime", label: "Last action or failure" },
        { value: "Everywhere", label: "No time filtering (the API's default)" },
      ],
      hint: "Which timestamp `timeFrom`/`timeTo` bound. Omit for no time filtering.",
    },
    {
      key: "timeFrom",
      label: "From",
      type: "datetime",
      hint: "ISO 8601. Lower bound for the chosen time filter.",
    },
    {
      key: "timeTo",
      label: "To",
      type: "datetime",
      hint: "ISO 8601. Upper bound for the chosen time filter.",
    },
    ...paginationParams(100, "Leads per page. The API returns at most 100."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching leads" },
    { key: "items", type: "array", label: "Leads in the campaign" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/GetLeadsFromCampaign", {
      method: "POST",
      body: compact({
        campaignId: input.campaignId,
        offset: input.offset,
        limit: input.limit,
        timeFrom: input.timeFrom,
        timeTo: input.timeTo,
        timeFilter: input.timeFilter,
      }),
    });
  },
};

export default action;
