import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface LabelListInput {
  accountId?: string;
}

interface LabelOutputItem {
  labelId: string;
  displayName: string;
  color: string;
  sequence: number;
}

/** `GET /api/accounts/{accountId}/labels` — "Get All Label Details". */
const labelList: ActionDefinition<LabelListInput, LabelOutputItem[]> = {
  key: "label-list",
  type: "read",
  resource: "label",
  title: "Get Labels",
  description: "List every label defined in the mailbox.",
  params: [accountIdParam],
  output: [
    { key: "labelId", type: "string", label: "Label ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Colour (hex)" },
    { key: "sequence", type: "number", label: "Sequence" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const labels = await new ZohoMailClient(ctx).request<LabelOutputItem[]>(
      `/accounts/${encodeURIComponent(accountId)}/labels`,
    );
    return labels ?? [];
  },
};

export default labelList;
