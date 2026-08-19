import type { ActionDefinition } from "@w6w/types";
import {
  assertUuid,
  BalenaClient,
  odataString,
  supervisorAccepted,
  supervisorError,
} from "../lib/client.ts";

/**
 * `POST /supervisor/v1/reboot` — reboot a device through balena's VPN.
 *
 * ## The update lock is a feature, and `force` is how you break it
 *
 * balena's supervisor refuses a reboot while a service holds an **update
 * lock** — the mechanism a service uses to say "I am mid-transaction, do not
 * interrupt me". A machine controlling a laser cutter takes that lock while
 * cutting.
 *
 * `force: true` overrides it. That is occasionally right and it is exactly the
 * thing to be deliberate about, so this action defaults to respecting the lock
 * and reports when a reboot was refused because of one — which is a *healthy*
 * outcome, not a failure.
 *
 * ## The device has to be online, and "online" means the VPN
 *
 * The request travels over balena's VPN to the supervisor. A device that is
 * powered on but off the network cannot receive it, and the request fails
 * rather than queuing — there is no "reboot when it comes back".
 *
 * ## The response shape is a fossil
 *
 * `{"Data":"OK","Error":""}` — capital D, capital E — kept for backwards
 * compatibility from a version briefly written in Go. Some routes answer with
 * a bare `OK` instead. A workflow checking `body.data` finds nothing on any
 * of them.
 */
const action: ActionDefinition = {
  key: "device-reboot",
  type: "perform",
  resource: "device",
  title: "Reboot a device",
  description:
    "Reboot through balena's VPN. Respects the supervisor's UPDATE LOCK by default — a service " +
    "holding one is saying it is mid-transaction — and reports a refusal as the healthy outcome " +
    "it is. The device must be ONLINE; there is no queued reboot.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "force",
      label: "Override the update lock",
      type: "boolean",
      default: false,
      hint: "A locked service is one that has declared itself mid-transaction. Forcing " +
        "interrupts it.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "accepted", type: "boolean", label: "Whether the supervisor took the request" },
    { key: "blockedByLock", type: "boolean", label: "Refused because a service holds the lock" },
    { key: "forced", type: "boolean", label: "Whether the lock was overridden" },
    { key: "wasOnline", type: "boolean", label: "Whether the device was reachable" },
    { key: "response", type: "object", label: "What the supervisor said" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const force = p.force === true;

    const client = new BalenaClient(ctx);
    const device = await client.one<{ is_online?: boolean; device_name?: string }>("device", {
      query: { $select: "is_online,device_name", $filter: `uuid eq ${odataString(uuid)}` },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    if (device.is_online !== true) {
      throw new Error(
        `device ${uuid} is not online. The reboot travels over balena's VPN to the supervisor, ` +
          "so an unreachable device cannot receive it — and there is no queued reboot that " +
          "fires when it returns",
      );
    }

    let response: unknown;
    let blockedByLock = false;
    try {
      response = await client.supervisor("/v1/reboot", uuid, force ? { force: true } : undefined);
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      // A lock is a service saying it is busy, which is the system working.
      if (/lock/i.test(message)) {
        blockedByLock = true;
        response = { Error: message };
      } else {
        throw err;
      }
    }

    const error = supervisorError(response);
    if (error && /lock/i.test(error)) blockedByLock = true;

    if (blockedByLock) {
      ctx.log(
        "info",
        "the reboot was refused because a service holds an UPDATE LOCK — it has declared itself " +
          "mid-transaction, and this is the lock doing its job rather than a failure",
        { uuid },
      );
    } else if (force) {
      ctx.log(
        "warn",
        "rebooted with the update lock overridden — any service that had declared " +
          "itself mid-transaction was interrupted",
        { uuid },
      );
    }

    return {
      uuid,
      accepted: !blockedByLock && supervisorAccepted(response),
      blockedByLock,
      forced: force,
      wasOnline: true,
      response,
    };
  },
};

export default action;
