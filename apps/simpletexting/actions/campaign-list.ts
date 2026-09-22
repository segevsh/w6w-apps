import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { campaignStateOptions, campaignTypeOptions, paginationParams } from "../lib/params.ts";

/**
 * `GET /api/campaigns` — "Get all Campaigns".
 *
 * A page of `FetchedCampaignDto` rows — the full campaign object, not a summary:
 * `{campaignId, title, accountPhone, customFieldsMaxLength, state, type, lists,
 * segments, created, modified, started, finished, messageTemplate, origin,
 * outcome, trackingLinks}`.
 *
 * ## Omitting `type` hides campaigns
 *
 * The endpoint's own description: "By default, if `type` is not specified, only
 * immediate campaigns are returned (scheduled and recurring campaigns will not
 * be included)." The schema shows no such default — this sentence is the only
 * place it is stated, and it is the difference between an empty list and the
 * campaign a workflow is looking for. `ALL` is offered as the first option for
 * that reason.
 *
 * ## `state` and `type` are two different filters
 *
 * `type` is *how the campaign was scheduled*; `state` is *what happened to it*.
 * A recurring campaign that finished is `type: RECURRING` and
 * `state: COMPLETED`, and filtering on only one of them returns the wrong set.
 * Note also that `state` can only be `MONITORING` ("includes 'stop' words or
 * malicious links") for a campaign the platform has held back — the row is the
 * only warning a workflow gets, since no other endpoint in this surface reports
 * it.
 */
interface Input {
  page?: number;
  size?: number;
  accountPhone?: string;
  type?: string;
  state?: string;
  listNameOrId?: string;
  startDateFrom?: string;
  startDateTo?: string;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns by type, state, list and start-date range.",
  params: [
    ...paginationParams(),
    {
      key: "type",
      label: "Campaign type",
      type: "select",
      options: campaignTypeOptions,
      hint:
        "How the campaign was scheduled. Leaving this blank returns only immediate campaigns, " +
        "per the endpoint's description — pick All to see scheduled and recurring ones.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      options: campaignStateOptions,
      hint: "What happened to the campaign. Different from the type above.",
    },
    {
      key: "accountPhone",
      label: "Sent from",
      type: "string",
      placeholder: "8005551234",
      hint: "Only campaigns sent from this account number.",
    },
    {
      key: "listNameOrId",
      label: "List",
      type: "string",
      placeholder: "My First List",
      hint: "Only campaigns sent to this list, by name or ID.",
    },
    {
      key: "startDateFrom",
      label: "Starting from",
      type: "string",
      placeholder: "2021-04-28T23:20:08.489Z",
      hint: "ISO 8601. Campaigns started at or after this time.",
    },
    {
      key: "startDateTo",
      label: "Starting before",
      type: "string",
      placeholder: "2021-05-28T23:20:08.489Z",
      hint: "ISO 8601. Campaigns started at or before this time.",
    },
  ],
  output: [
    { key: "content", type: "array", label: "Campaigns" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/campaigns", {
      query: {
        page: input.page,
        size: input.size,
        type: input.type,
        state: input.state,
        accountPhone: input.accountPhone,
        listNameOrId: input.listNameOrId,
        startDateFrom: input.startDateFrom,
        startDateTo: input.startDateTo,
      },
    });
  },
};

export default campaignList;
