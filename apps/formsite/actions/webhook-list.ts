import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks subscribed on a form.",
  params: [formDir],
  output: [{ key: "webhooks", type: "array", label: "Webhooks" }],

  async execute(input, ctx) {
    const res = await new FormsiteClient(ctx).request<{ webhooks?: unknown[] }>(
      `/forms/${encodeURIComponent(input.formDir)}/webhooks`,
    );
    return { webhooks: res.webhooks ?? [] };
  },
};

export default webhookList;
