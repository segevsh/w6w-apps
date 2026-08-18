import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `GET /api/systems/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systems_get`).
 */
const action: ActionDefinition = {
  key: "system-get",
  type: "read",
  resource: "system",
  title: "Get a device",
  description: "Retrieve one enrolled device by id.",
  params: [
    { key: "systemId", label: "Device ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "_id", type: "string", label: "Device ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "hostname", type: "string", label: "Hostname" },
    { key: "serialNumber", type: "string", label: "Serial number" },
    { key: "os", type: "string", label: "Operating system" },
    { key: "version", type: "string", label: "OS version" },
    { key: "agentVersion", type: "string", label: "Agent version" },
    { key: "active", type: "boolean", label: "Agent checked in recently — not 'powered on now'" },
    { key: "lastContact", type: "string", label: "Last agent contact" },
    { key: "systemInsights", type: "object", label: "System Insights state" },
    { key: "fde", type: "object", label: "Full disk encryption" },
    { key: "networkInterfaces", type: "array", label: "Network interfaces" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.systemId ?? "").trim();
    if (!id) throw new Error("`systemId` is required");

    ctx.log("info", "getting a JumpCloud device", { id });

    return await new JumpCloudClient(ctx).request(`/systems/${encodeURIComponent(id)}`);
  },
};

export default action;
