import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /estimates/{estimate_id}/options/{option_id}/line_items` — the priced
 * lines of one estimate option.
 *
 * Line items hang off an *option*, not off the estimate: an estimate presenting
 * good/better/best has three options, each with its own lines and its own total.
 * The option ids come from Get Estimate's `options` array.
 */
interface Input {
  estimateId: string;
  optionId: string;
  page?: number;
  pageSize?: number;
  companyId?: string;
}

const estimateOptionLineItemList: ActionDefinition<Input, NormalizedList> = {
  key: "estimate-option-line-item-list",
  type: "read",
  resource: "estimate",
  title: "List Estimate Option Line Items",
  description:
    "List the line items on one option of an estimate. Option ids come from Get Estimate's " +
    "`options` array.",
  params: [
    { key: "estimateId", label: "Estimate ID", type: "string", required: true },
    { key: "optionId", label: "Option ID", type: "string", required: true },
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Line items"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list(
      `/estimates/${encodeId(input.estimateId)}/options/${encodeId(input.optionId)}/line_items`,
      "line_items",
      {
        companyId: input.companyId,
        query: { page: input.page, page_size: input.pageSize },
      },
    );
  },
};

export default estimateOptionLineItemList;
