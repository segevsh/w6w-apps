import type { ActionDefinition } from "@w6w/types";
import { customFields, FreshserviceClient, unset } from "../lib/client.ts";
import { assetImpactOptions, assetUsageTypeOptions, workspaceId } from "../lib/params.ts";

interface Input {
  name: string;
  assetTypeId: number;
  assetTag?: string;
  description?: string;
  impact?: string;
  usageType?: string;
  userId?: number;
  locationId?: number;
  departmentId?: number;
  agentId?: number;
  groupId?: number;
  assignedOn?: string;
  workspaceId?: number;
  typeFields?: unknown;
}

const assetCreate: ActionDefinition<Input> = {
  key: "asset-create",
  type: "perform",
  resource: "asset",
  title: "Create Asset",
  description:
    "Add an asset to the CMDB. `Type fields` carries the asset-type-specific attributes, whose keys are suffixed with the asset type ID.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "assetTypeId",
      label: "Asset type ID",
      type: "number",
      required: true,
      hint: "From the Asset Types API — it decides which `Type fields` keys are valid.",
    },
    { key: "assetTag", label: "Asset tag", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      row: "grade",
      default: "low",
      options: assetImpactOptions,
    },
    {
      key: "usageType",
      label: "Usage type",
      type: "select",
      row: "grade",
      default: "permanent",
      options: assetUsageTypeOptions,
    },
    { key: "userId", label: "Used by (user ID)", type: "number", row: "owner" },
    { key: "agentId", label: "Managed by (agent ID)", type: "number", row: "owner" },
    { key: "groupId", label: "Managed by (group ID)", type: "number", row: "owner" },
    { key: "locationId", label: "Location ID", type: "number", row: "place" },
    { key: "departmentId", label: "Department ID", type: "number", row: "place" },
    { key: "assignedOn", label: "Assigned on", type: "datetime", advanced: true },
    workspaceId,
    {
      key: "typeFields",
      label: "Type fields",
      type: "json",
      advanced: true,
      hint:
        '{ "serial_number_25": "SW12131133", "asset_state_25": "In Use" } — the suffix is the asset type ID.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Asset ID" },
    { key: "display_id", type: "number", label: "Display ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new FreshserviceClient(ctx).resource("asset", "/assets", {
      method: "POST",
      body: {
        name: input.name,
        asset_type_id: input.assetTypeId,
        asset_tag: unset(input.assetTag),
        description: unset(input.description),
        impact: unset(input.impact),
        usage_type: unset(input.usageType),
        user_id: input.userId,
        location_id: input.locationId,
        department_id: input.departmentId,
        agent_id: input.agentId,
        group_id: input.groupId,
        assigned_on: unset(input.assignedOn),
        workspace_id: input.workspaceId,
        // Same flat `{ name: value }` shape as custom_fields, so the same
        // parser applies.
        type_fields: customFields(input.typeFields),
      },
    });
  },
};

export default assetCreate;
