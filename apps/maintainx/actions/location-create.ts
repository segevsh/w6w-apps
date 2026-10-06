import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MaintainXClient, toIdList } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/** `POST /v1/locations` — only `name` is required; answers `{ id }` (200, not 201). */
interface Input {
  name: string;
  description?: string;
  address?: string;
  barcode?: string;
  parentId?: number;
  vendorIds?: string;
  externalId?: string;
  extraFields?: string | Record<string, string>;
  organizationId?: number;
}

const locationCreate: ActionDefinition<Input> = {
  key: "location-create",
  type: "perform",
  resource: "location",
  title: "Create Location",
  description: "Create a location and return its id.",
  // No idempotency key: a retry creates a duplicate location.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "address", label: "Address", type: "string" },
    { key: "barcode", label: "Barcode", type: "string" },
    { key: "parentId", label: "Parent location ID", type: "number" },
    { key: "vendorIds", label: "Vendor IDs", type: "string", hint: "Comma-separated." },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "extraFields", label: "Custom fields (JSON)", type: "json" },
    organizationIdParam,
  ],
  output: [{ key: "id", type: "number", label: "New location id" }],

  async execute(input, ctx) {
    return await new MaintainXClient(ctx).request("/locations", {
      method: "POST",
      organizationId: input.organizationId,
      body: compact({
        name: input.name,
        description: input.description,
        address: input.address,
        barcode: input.barcode,
        parentId: input.parentId,
        vendorIds: toIdList(input.vendorIds, "vendorIds"),
        externalId: input.externalId,
        extraFields: asOptionalJson(input.extraFields, "extraFields"),
      }),
    });
  },
};

export default locationCreate;
