import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MaintainXClient, toIdList, toList } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/** `POST /v1/assets` — only `name` is required; answers 201 `{ id }`. */
interface Input {
  name: string;
  description?: string;
  serialNumber?: string;
  barcode?: string;
  locationId?: number;
  parentId?: number;
  criticalityId?: number;
  teamIds?: string;
  vendorIds?: string;
  assetTypes?: string;
  manufacturerName?: string;
  modelName?: string;
  externalId?: string;
  extraFields?: string | Record<string, string>;
  organizationId?: number;
}

const assetCreate: ActionDefinition<Input> = {
  key: "asset-create",
  type: "perform",
  resource: "asset",
  title: "Create Asset",
  description: "Register a new asset and return its id.",
  // No idempotency key: a retry creates a duplicate asset (set an external id to find it).
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "serialNumber", label: "Serial number", type: "string" },
    { key: "barcode", label: "Barcode", type: "string" },
    { key: "locationId", label: "Location ID", type: "number" },
    { key: "parentId", label: "Parent asset ID", type: "number" },
    { key: "criticalityId", label: "Criticality ID", type: "number" },
    { key: "teamIds", label: "Team IDs", type: "string", hint: "Comma-separated." },
    { key: "vendorIds", label: "Vendor IDs", type: "string", hint: "Comma-separated." },
    { key: "assetTypes", label: "Asset types", type: "string", hint: "Comma-separated labels." },
    { key: "manufacturerName", label: "Manufacturer name", type: "string" },
    { key: "modelName", label: "Model name", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
    {
      key: "extraFields",
      label: "Custom fields (JSON)",
      type: "json",
      hint: "Object keyed by the exact custom-field label, values as strings.",
    },
    organizationIdParam,
  ],
  output: [{ key: "id", type: "number", label: "New asset id" }],

  async execute(input, ctx) {
    return await new MaintainXClient(ctx).request("/assets", {
      method: "POST",
      organizationId: input.organizationId,
      body: compact({
        name: input.name,
        description: input.description,
        serialNumber: input.serialNumber,
        barcode: input.barcode,
        locationId: input.locationId,
        parentId: input.parentId,
        criticalityId: input.criticalityId,
        teamIds: toIdList(input.teamIds, "teamIds"),
        vendorIds: toIdList(input.vendorIds, "vendorIds"),
        assetTypes: toList(input.assetTypes),
        manufacturer: input.manufacturerName ? { name: input.manufacturerName } : undefined,
        model: input.modelName ? { name: input.modelName } : undefined,
        externalId: input.externalId,
        extraFields: asOptionalJson(input.extraFields, "extraFields"),
      }),
    });
  },
};

export default assetCreate;
