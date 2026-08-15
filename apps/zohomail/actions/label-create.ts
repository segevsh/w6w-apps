import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface LabelCreateInput {
  accountId?: string;
  displayName: string;
  color?: string;
}

interface LabelCreateOutput {
  labelId: string;
  displayName: string;
  color: string;
  sequence: number;
}

/** `POST /api/accounts/{accountId}/labels` — "Create a New Label". */
const labelCreate: ActionDefinition<LabelCreateInput, LabelCreateOutput> = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Add a new label to the mailbox.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "displayName", label: "Name", type: "string", required: true },
    {
      key: "color",
      label: "Colour (hex)",
      type: "string",
      placeholder: "#ffd700",
      hint: "Defaults to #ffd700 (Zoho's own default) if left empty.",
      validation: { pattern: "^#[0-9a-fA-F]{6}$" },
    },
  ],
  output: [
    { key: "labelId", type: "string", label: "Label ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Colour (hex)" },
    { key: "sequence", type: "number", label: "Sequence" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const label = await new ZohoMailClient(ctx).request<LabelCreateOutput>(
      `/accounts/${encodeURIComponent(accountId)}/labels`,
      { method: "POST", body: compact({ displayName: input.displayName, color: input.color }) },
    );
    if (!label) throw new Error("Zoho Mail did not return the created label");
    return label;
  },
};

export default labelCreate;
