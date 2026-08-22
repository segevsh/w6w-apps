import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `DELETE /api/systems/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systems_delete`).
 *
 * This removes the device from the directory and tells the agent to uninstall
 * itself. It does **not** wipe the machine — that is `system-erase` — and it
 * does not recover a lost laptop: an unenrolled device keeps whatever local
 * accounts it already has. Re-enrolling means installing the agent again.
 */
const action: ActionDefinition = {
  key: "system-delete",
  type: "perform",
  resource: "system",
  title: "Delete a device",
  description: "Unenrol a device and uninstall its agent. Does not wipe the machine.",
  idempotent: true,
  params: [
    { key: "systemId", label: "Device ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I understand this unenrols the device",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Re-enrolling means installing the agent again by hand.",
    },
  ],
  output: [
    { key: "systemId", type: "string", label: "Device ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.systemId ?? "").trim();
    if (!id) throw new Error("`systemId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — unenrolling cannot be undone remotely");
    }

    ctx.log("warn", "deleting a JumpCloud device", { id });

    await new JumpCloudClient(ctx).request(`/systems/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return { systemId: id, deleted: true };
  },
};

export default action;
