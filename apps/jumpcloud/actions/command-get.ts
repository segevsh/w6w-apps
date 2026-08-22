import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `GET /api/commands/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`commands_get`).
 *
 * Worth reading before `command-run`: the response carries the script body and
 * the `systems` / `systemgroups` it is bound to, and those bindings are what a
 * run with no explicit device list fans out to.
 */
const action: ActionDefinition = {
  key: "command-get",
  type: "read",
  resource: "command",
  title: "Get a command",
  description: "Retrieve a saved command, its script and the devices it is bound to.",
  params: [
    { key: "commandId", label: "Command ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "_id", type: "string", label: "Command ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "command", type: "string", label: "The script itself" },
    { key: "commandType", type: "string", label: "windows, mac or linux" },
    { key: "launchType", type: "string", label: "manual, repeated, one-time or trigger" },
    { key: "trigger", type: "string", label: "Webhook trigger name, when launchType is trigger" },
    { key: "systems", type: "array", label: "Bound devices — what a run with no list targets" },
    { key: "systemgroups", type: "array", label: "Bound device groups" },
    { key: "timeout", type: "string", label: "Timeout in seconds" },
    { key: "sudo", type: "boolean", label: "Runs as root/administrator" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.commandId ?? "").trim();
    if (!id) throw new Error("`commandId` is required");

    ctx.log("info", "getting a JumpCloud command", { id });

    return await new JumpCloudClient(ctx).request(`/commands/${encodeURIComponent(id)}`);
  },
};

export default action;
