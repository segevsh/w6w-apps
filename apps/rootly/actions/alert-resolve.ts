import type { ActionDefinition } from "@w6w/types";
import { compact, itemResult, jsonApiBody, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
  resolution_message?: string;
  resolve_related_incidents?: boolean;
}

/** `POST /v1/alerts/{id}/resolve` */
const alertResolve: ActionDefinition<Input> = {
  key: "alert-resolve",
  type: "perform",
  resource: "alert",
  title: "Resolve Alert",
  description: "Resolve an alert, optionally resolving the incidents related to it.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Alert ID",
      type: "string",
      required: true,
    },
    {
      key: "resolution_message",
      label: "Resolution message",
      type: "text",
    },
    {
      key: "resolve_related_incidents",
      label: "Resolve related incidents",
      type: "boolean",
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("POST", `/v1/alerts/${seg(input.id)}/resolve`, {
      body: jsonApiBody(
        "alerts",
        compact({
          resolution_message: input.resolution_message,
          resolve_related_incidents: input.resolve_related_incidents,
        }),
      ),
    });
    return itemResult(res);
  },
};

export default alertResolve;
