import type { ActionDefinition } from "@w6w/types";
import { compact, csv, JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/runCommand` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`commands_run`).
 *
 * **Two things about this endpoint make an ordinary-looking call dangerous.**
 *
 * *Omitting the device list does not mean "nowhere".* JumpCloud's own parameter
 * description: *"An optional list of device IDs to run the command on. If
 * omitted, the command will run on devices bound to the command."* A saved
 * command bound to a device group runs on **every machine in it** — which may
 * be the fleet. This app therefore makes the target an explicit choice: either
 * name devices, or tick "run on the command's own bindings" and mean it.
 *
 * *The response is not a result.* It returns `queueIds` and a
 * `workflowInstanceId` — the command was **queued**. Whether the script
 * succeeded, failed, or is still waiting for a laptop to come back online is in
 * `command-result-list`, minutes or days later. A workflow that treats this
 * call's success as "the script ran" is wrong on every offline device.
 */
const action: ActionDefinition = {
  key: "command-run",
  type: "perform",
  resource: "command",
  title: "Run a command",
  description: "Queue a saved command against named devices, or its own bound targets.",
  // Running twice runs the script twice; JumpCloud queues both.
  idempotent: false,
  params: [
    { key: "commandId", label: "Command ID", type: "string", required: true, default: "" },
    {
      key: "systemIds",
      label: "Device IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Leave blank ONLY with the option below ticked.",
    },
    {
      key: "useCommandBindings",
      label: "Run on the command's own bound devices",
      type: "boolean",
      default: false,
      hint: "With no device ids, JumpCloud runs on every device and group bound to the " +
        "command — which can be the whole fleet. This makes that an explicit choice.",
    },
  ],
  output: [
    { key: "queueIds", type: "array", label: "Queue IDs — one per device it was queued for" },
    { key: "workflowInstanceId", type: "string", label: "Workflow instance ID" },
    { key: "queued", type: "boolean", label: "Queued — NOT a statement that the script ran" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.commandId ?? "").trim();
    if (!id) throw new Error("`commandId` is required");
    const systemIds = csv(p.systemIds);
    const useBindings = p.useCommandBindings === true;

    if (!systemIds && !useBindings) {
      throw new Error(
        "no target — name `systemIds`, or tick `useCommandBindings` to run on every device " +
          "bound to the command",
      );
    }
    if (systemIds && useBindings) {
      throw new Error(
        "pick one target — naming `systemIds` overrides the command's bindings, so ticking " +
          "`useCommandBindings` as well is ambiguous",
      );
    }

    ctx.log("info", "queueing a JumpCloud command", {
      id,
      devices: systemIds?.length ?? "the command's own bindings",
    });

    const result = await new JumpCloudClient(ctx).request<
      { queueIds?: string[]; workflowInstanceId?: string }
    >("/runCommand", {
      method: "POST",
      body: compact({ _id: id, systemIds }),
    });
    return { ...result, queued: true };
  },
};

export default action;
