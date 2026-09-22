import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HeyReachClient, numberList } from "../lib/client.ts";

interface Input {
  name: string;
  linkedInUserListId: number;
  linkedInAccountIds: number[] | string;
  excludeContactedFromOtherCampaigns?: boolean;
  excludeHasOtherAccConversations?: boolean;
  excludeContactedFromSenderInOtherCampaign?: boolean;
  excludeListId?: number;
  schedule?: unknown;
  sequence?: unknown;
}

/**
 * `POST /api/public/campaign/Create` — a campaign in **DRAFT** status.
 *
 * ## The body comes from the operation's prose, not its schema
 *
 * The document's `requestBody` for this operation is a bare
 * `{"type":"string"}` — a generator artifact, like
 * `campaign/GetLeadsFromCampaign`'s and `webhooks/CreateWebhook`'s. The
 * operation's own `description` documents the body field by field
 * (`name`, `linkedInUserListId`, `linkedInAccountIds`, the three `exclude*`
 * booleans, `excludeListId`, `schedule`, `sequence`) and the 200 schema
 * (`{ campaignId }`) is fully specified, so the fields below are the
 * document's, not an inference from a sibling API.
 *
 * ## It creates a draft; it does not start anything
 *
 * The campaign cannot be activated without a sequence. Omitting `sequence` here
 * is legitimate — the document says so explicitly — but then Start Campaign
 * will refuse until `campaign/UpdateSequence` (deliberately **not** implemented
 * in this build) adds one. `schedule` and `sequence` are therefore free-form
 * `json` fields: their shapes are defined by `UpdateSequence`'s own reference
 * section, which this app does not claim to implement.
 *
 * Every node that follows an action step needs an `actionDelay` of at least
 * three hours — the document says an omitted or `0` delay is rejected — which is
 * worth knowing before hand-writing a sequence body.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a campaign in DRAFT status, optionally with its schedule and sequence " +
    "(POST /api/public/campaign/Create). Start it separately with Start Campaign.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Campaign name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 50 },
      hint: "1–50 characters, per the document's own bound.",
    },
    {
      key: "linkedInUserListId",
      label: "Lead list",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "A LEAD list to draw leads from. It must exist and be of type USER_LIST.",
    },
    {
      key: "linkedInAccountIds",
      label: "Sender accounts",
      type: "array",
      item: { type: "number" },
      required: true,
      hint: "1–100 LinkedIn account ids. Every one must exist and have valid auth.",
    },
    {
      key: "excludeContactedFromOtherCampaigns",
      label: "Exclude leads in other campaigns",
      type: "boolean",
      hint: "Skip leads that already sit in any other campaign. Defaults to false.",
    },
    {
      key: "excludeHasOtherAccConversations",
      label: "Exclude leads contacted by other senders",
      type: "boolean",
      hint: "Skip leads that already have conversations with other sender accounts. " +
        "Defaults to false.",
    },
    {
      key: "excludeContactedFromSenderInOtherCampaign",
      label: "Exclude leads this sender contacted elsewhere",
      type: "boolean",
      hint: "Skip leads the sender accounts have already contacted in other campaigns. " +
        "Defaults to false.",
    },
    {
      key: "excludeListId",
      label: "Exclusion list",
      type: "number",
      validation: { integer: true },
      hint: "A separate list of leads to always exclude. Must not equal the lead list above.",
    },
    {
      key: "schedule",
      label: "Schedule",
      type: "json",
      advanced: true,
      placeholder: '{"timezone": "UTC", "days": [1,2,3,4,5]}',
      hint: "The campaign's schedule object, as documented under UpdateSequence/UpdateSchedule " +
        "(not implemented in this app). Omit for the default: Mon–Fri 09:00–17:00 UTC.",
    },
    {
      key: "sequence",
      label: "Sequence",
      type: "json",
      advanced: true,
      hint: "The sequence node object, as documented under UpdateSequence (not implemented in " +
        "this app). The START node is implicit; do not include it. Omit for a campaign with no " +
        "sequence — which cannot be started until one is added.",
    },
  ],
  output: [{ key: "campaignId", type: "number", label: "Created campaign ID" }],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/campaign/Create", {
      method: "POST",
      body: compact({
        name: input.name,
        linkedInUserListId: input.linkedInUserListId,
        linkedInAccountIds: numberList(input.linkedInAccountIds, "Sender accounts"),
        excludeContactedFromOtherCampaigns: input.excludeContactedFromOtherCampaigns,
        excludeHasOtherAccConversations: input.excludeHasOtherAccConversations,
        excludeContactedFromSenderInOtherCampaign: input.excludeContactedFromSenderInOtherCampaign,
        excludeListId: input.excludeListId,
        schedule: asOptionalJson(input.schedule, "Schedule"),
        sequence: asOptionalJson(input.sequence, "Sequence"),
      }),
    });
  },
};

export default action;
