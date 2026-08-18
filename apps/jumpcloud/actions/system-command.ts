import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systems/{id}/command/builtin/{lock,restart,shutdown}` (V1) —
 * verified against JumpCloud's V1 OpenAPI document
 * (`systems_commandBuiltinLock`, `…Restart`, `…Shutdown`).
 *
 * **Erase is deliberately not one of the choices here.** JumpCloud has a fourth
 * builtin on the same path shape, and putting it in this select would mean one
 * wrong dropdown value wipes a laptop. It lives in `system-erase`, behind its
 * own confirmation.
 *
 * **These commands queue.** JumpCloud's own description says it: *"If a device
 * is offline, the command will be run when the device becomes available."* So a
 * success here means *accepted*, not *done* — a restart sent to a machine in a
 * bag runs when it is next opened, possibly days later. Nothing in the response
 * distinguishes the two cases, which is why the output says so.
 */
const BUILTINS = ["lock", "restart", "shutdown"] as const;

const action: ActionDefinition = {
  key: "system-command",
  type: "perform",
  resource: "system",
  title: "Lock, restart or shut down a device",
  description: "Send a builtin device command. Queues if the device is offline.",
  // Sending twice sends two commands; there is no de-duplication.
  idempotent: false,
  params: [
    { key: "systemId", label: "Device ID", type: "string", required: true, default: "" },
    {
      key: "command",
      label: "Command",
      type: "select",
      required: true,
      default: "lock",
      options: [
        { value: "lock", label: "Lock the screen" },
        { value: "restart", label: "Restart" },
        { value: "shutdown", label: "Shut down" },
      ],
      hint: "Erase is a separate action, on purpose.",
    },
  ],
  output: [
    { key: "systemId", type: "string", label: "Device ID" },
    { key: "command", type: "string", label: "Command sent" },
    { key: "queued", type: "boolean", label: "Accepted — runs now if online, later if not" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.systemId ?? "").trim();
    if (!id) throw new Error("`systemId` is required");
    const command = String(p.command ?? "lock");
    if (!(BUILTINS as readonly string[]).includes(command)) {
      throw new Error(`\`command\` must be one of ${BUILTINS.join(", ")}`);
    }

    ctx.log("info", "sending a JumpCloud builtin device command", { id, command });

    await new JumpCloudClient(ctx).request(
      `/systems/${encodeURIComponent(id)}/command/builtin/${command}`,
      { method: "POST" },
    );
    return { systemId: id, command, queued: true };
  },
};

export default action;
