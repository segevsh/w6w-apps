import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `DELETE /v1/{source_id}/charges/{oid}` — Delete a charge that was added through the API. */
interface Input {
  source_id: string;
  oid: string;
}

const chargeDelete: ActionDefinition<Input> = {
  key: "charge-delete",
  type: "perform",
  resource: "charge",
  title: "Delete Charge",
  description: "Delete a charge that was added through the API.",
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
    { key: "oid", label: "Charge OID", type: "string", required: true },
  ],
  output: [
    { key: "result", type: "object", label: "Vendor response body" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "DELETE",
      `/${encodeId(input.source_id)}/charges/${encodeId(input.oid)}`,
    );
  },
};

export default chargeDelete;
