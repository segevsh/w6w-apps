import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `DELETE /v1/{source_id}/customers/{oid}` — Delete a customer that was added through the API. */
interface Input {
  source_id: string;
  oid: string;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Delete a customer that was added through the API.",
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
    { key: "oid", label: "Customer OID", type: "string", required: true },
  ],
  output: [
    { key: "result", type: "object", label: "Vendor response body" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "DELETE",
      `/${encodeId(input.source_id)}/customers/${encodeId(input.oid)}`,
    );
  },
};

export default customerDelete;
