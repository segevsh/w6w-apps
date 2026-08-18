import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systems/{id}/command/builtin/erase` (V1) — verified against
 * JumpCloud's V1 OpenAPI document (`systems_commandBuiltinErase`).
 *
 * **This wipes the device.** It is the most destructive call this app can make,
 * and two things about it are worse than they first look:
 *
 *   - **It queues.** JumpCloud's own description: *"If a device is offline, the
 *     command will be run when the device becomes available."* An erase sent to
 *     a machine that is switched off is not a no-op — it is a landmine. The
 *     laptop wipes when someone next opens it, which may be weeks later and may
 *     be after the decision was reversed. There is no unqueue.
 *   - **Nothing about the response says which happened.** A wipe that ran and a
 *     wipe that is waiting look identical from here.
 *
 * So it is its own action rather than a value in `system-command`'s dropdown,
 * it requires an explicit confirmation, and it logs at `warn` with the device
 * id — because that log line may be the only record of who sent it.
 */
const action: ActionDefinition = {
  key: "system-erase",
  type: "perform",
  resource: "system",
  title: "Erase a device",
  description: "Remotely wipe a device. Queues and fires later if the device is offline.",
  idempotent: false,
  params: [
    {
      key: "systemId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
      hint: "Check this id twice. There is no undo and no unqueue.",
    },
    {
      key: "confirm",
      label: "I understand this wipes the device, now or when it next comes online",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. An erase queued against an offline device fires whenever it returns.",
    },
  ],
  output: [
    { key: "systemId", type: "string", label: "Device ID" },
    { key: "erased", type: "boolean", label: "Erase accepted — ran now, or queued for later" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.systemId ?? "").trim();
    if (!id) throw new Error("`systemId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "`confirm` must be true — an erase cannot be undone, and cannot be unqueued once sent",
      );
    }

    ctx.log("warn", "ERASING a JumpCloud device", { id });

    await new JumpCloudClient(ctx).request(
      `/systems/${encodeURIComponent(id)}/command/builtin/erase`,
      { method: "POST" },
    );
    return { systemId: id, erased: true };
  },
};

export default action;
