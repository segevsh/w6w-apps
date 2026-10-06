import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/{source_id}/charges/{oid}` — Fetch one charge by oid. */
interface Input {
  source_id: string;
  oid: string;
}

const chargeGet: ActionDefinition<Input> = {
  key: "charge-get",
  type: "read",
  resource: "charge",
  title: "Get Charge",
  description: "Fetch one charge by oid.",
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Charge OID", type: "string", required: true },
  ],
  output: [
    { key: "charge", type: "object", label: "The charge" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/${encodeId(input.source_id)}/charges/${encodeId(input.oid)}`,
    );
  },
};

export default chargeGet;
