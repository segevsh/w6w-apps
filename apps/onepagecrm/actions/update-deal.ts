import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";
import { DEAL_FIELD_PARAMS, dealBody } from "../lib/params.ts";

/**
 * `PUT /deals/{deal_id}` — update a deal. A deal stays with its contact (`contact_id` cannot
 * change). The portal states that a PUT replaces the record unless `partial=true`, so this sends
 * `partial=true` by default; set `replace` for the vendor's full-replace behaviour.
 */
const updateDeal: ActionDefinition<Record<string, unknown>> = {
  key: "update-deal",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description:
    "Change fields on a deal, e.g. mark it won or lost. Only the fields you send change.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
    ...DEAL_FIELD_PARAMS,
    {
      key: "replace",
      label: "Replace whole record",
      type: "boolean",
      default: false,
      hint: "Off (default) = partial update. On = vendor full replace: omitted fields are reset.",
    },
  ],
  output: [{ key: "deal", type: "object", label: "The updated deal" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(`/deals/${encodeId(input.dealId as string)}`, {
      method: "PUT",
      query: { partial: input.replace === true ? undefined : true },
      body: dealBody(input),
    });
  },
};

export default updateDeal;
