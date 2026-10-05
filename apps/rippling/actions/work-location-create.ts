import type { ActionDefinition } from "@w6w/types";
import { RipplingClient } from "../lib/client.ts";
import { addressFromInput, addressParams } from "../lib/work-location.ts";

const workLocationCreate: ActionDefinition<Record<string, unknown>> = {
  key: "work-location-create",
  type: "perform",
  resource: "work-location",
  title: "Create Work Location",
  description:
    "Create a work location. Requires the `work-locations.read-write` scope on the API token. Not idempotent: Rippling documents no idempotency key, so a retry may create a duplicate.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    ...addressParams,
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address (with Rippling's formatted line)" },
  ],
  execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("name is required");
    // `address` is a required member of the create body in Rippling's reference.
    return new RipplingClient(ctx).json("/work-locations/", {
      method: "POST",
      body: { name, address: addressFromInput(input) ?? {} },
    });
  },
};

export default workLocationCreate;
