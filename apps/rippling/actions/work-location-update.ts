import type { ActionDefinition } from "@w6w/types";
import { encodeId, RipplingClient } from "../lib/client.ts";
import { addressFromInput, addressParams } from "../lib/work-location.ts";
import { idParam } from "../lib/params.ts";

const workLocationUpdate: ActionDefinition<Record<string, unknown>> = {
  key: "work-location-update",
  type: "perform",
  resource: "work-location",
  title: "Update Work Location",
  description:
    "Update a work location. Requires the `work-locations.read-write` scope on the API token. A PATCH: only the fields you set are sent.",
  idempotent: true,
  params: [idParam, { key: "name", label: "Name", type: "string" }, ...addressParams],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "object", label: "Address (with Rippling's formatted line)" },
  ],
  execute(input, ctx) {
    const id = String(input.id ?? "").trim();
    if (!id) throw new Error("id is required");
    const body: Record<string, unknown> = {};
    const name = String(input.name ?? "").trim();
    if (name) body.name = name;
    const address = addressFromInput(input);
    if (address) body.address = address;
    if (Object.keys(body).length === 0) throw new Error("set at least one field to update");
    return new RipplingClient(ctx).json(`/work-locations/${encodeId(id)}/`, {
      method: "PATCH",
      body,
    });
  },
};

export default workLocationUpdate;
