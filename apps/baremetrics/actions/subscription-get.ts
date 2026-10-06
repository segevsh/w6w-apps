import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/subscriptions/{oid}` — Fetch one subscription by oid. */
interface Input {
  source_id: string;
  oid: string;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Fetch one subscription by oid.",
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
    { key: "subscription", type: "object", label: "The subscription" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/${encodeId(input.source_id)}/subscriptions/${encodeId(input.oid)}`,
    );
  },
};

export default subscriptionGet;
