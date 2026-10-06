import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `DELETE /v1/{source_id}/subscriptions/{oid}` — Delete a subscription that was added through the API. */
interface Input {
  source_id: string;
  oid: string;
}

const subscriptionDelete: ActionDefinition<Input> = {
  key: "subscription-delete",
  type: "perform",
  resource: "subscription",
  title: "Delete Subscription",
  description: "Delete a subscription that was added through the API.",
  idempotent: true,
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Subscription OID", type: "string", required: true },
  ],
  output: [
    { key: "result", type: "object", label: "Vendor response body" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "DELETE",
      `/${encodeId(input.source_id)}/subscriptions/${encodeId(input.oid)}`,
    );
  },
};

export default subscriptionDelete;
