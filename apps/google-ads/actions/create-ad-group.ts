import type { ActionDefinition } from "@w6w/types";
import {
  assertEnum,
  compact,
  GoogleAdsClient,
  jsonObject,
  resolveResourceName,
} from "../lib/client.ts";
import { customerId, mutateOutput, partialFailure, validateOnly } from "../lib/params.ts";

interface Input {
  name: string;
  campaignId: string;
  type?: string;
  status?: string;
  cpcBidMicros?: number;
  additionalFields?: string;
  customerId?: string;
  validateOnly?: boolean;
  partialFailure?: boolean;
}

/**
 * `AdGroupService.Mutate` (create) —
 * `POST /v25/customers/{customerId}/adGroups:mutate`.
 *
 * `campaign` is a resource reference, so a bare campaign id is expanded to
 * `customers/{cid}/campaigns/{id}` and a full resource name passes through —
 * the same convention as `create-campaign`'s budget reference.
 *
 * `ad_group.type` must match the parent campaign's channel: a Search campaign
 * takes `SEARCH_STANDARD`, a Display campaign `DISPLAY_STANDARD`, and so on.
 * The select lists the common ones; the full `AdGroupType` enum has ~17
 * members, and an unlisted one can be passed through `additionalFields`.
 *
 * Like the other creates: not idempotent, and `status` defaults to `PAUSED` so
 * an automated call does not start serving by accident.
 */
const createAdGroup: ActionDefinition<Input> = {
  key: "create-ad-group",
  type: "perform",
  resource: "ad_group",
  title: "Create Ad Group",
  description: "Create an ad group inside a campaign. Defaults to PAUSED.",
  idempotent: false,
  params: [
    { key: "name", label: "Ad group name", type: "string", required: true },
    {
      key: "campaignId",
      label: "Campaign",
      type: "string",
      required: true,
      hint: "Campaign ID or resource name.",
    },
    {
      key: "type",
      label: "Ad group type",
      type: "select",
      options: [
        { value: "SEARCH_STANDARD", label: "Search standard" },
        { value: "DISPLAY_STANDARD", label: "Display standard" },
        { value: "SHOPPING_PRODUCT_ADS", label: "Shopping product ads" },
        { value: "SEARCH_DYNAMIC_ADS", label: "Search dynamic ads" },
        { value: "VIDEO_RESPONSIVE", label: "Video responsive" },
      ],
      hint: "Must match the parent campaign's channel type.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "PAUSED",
      options: [
        { value: "PAUSED", label: "Paused" },
        { value: "ENABLED", label: "Enabled" },
      ],
    },
    {
      key: "cpcBidMicros",
      label: "CPC bid (micros)",
      type: "number",
      hint: "Micros of the account currency — 1,000,000 micros = 1 unit. A $1.50 bid is 1500000.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "Any other AdGroup field, merged into the create body.",
    },
    customerId,
    validateOnly,
    partialFailure,
  ],
  output: mutateOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const cid = client.customerId(input.customerId);
    const create = {
      ...compact({
        name: input.name,
        campaign: resolveResourceName(cid, "campaigns", input.campaignId, "campaignId"),
        type: input.type ? assertEnum(input.type, "type") : undefined,
        status: input.status ? assertEnum(input.status, "status") : "PAUSED",
        cpcBidMicros: input.cpcBidMicros,
      }),
      ...jsonObject(input.additionalFields, "additionalFields"),
    };
    ctx.log("info", "creating ad group", { customerId: cid, name: input.name });
    return client.mutate(cid, "adGroups", {
      operations: [{ create }],
      ...compact({ validateOnly: input.validateOnly, partialFailure: input.partialFailure }),
    });
  },
};

export default createAdGroup;
