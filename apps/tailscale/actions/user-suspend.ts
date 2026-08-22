import type { ActionDefinition } from "@w6w/types";
import { TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/users/{userId}/suspend` and `/restore` — cut a person off, or
 * let them back.
 *
 * ## This is the offboarding action, and it has one important limit
 *
 * Suspending a user stops them authenticating: no new device, no new session.
 * Their **existing devices keep working until their node keys expire**, which
 * for a tagged machine is never and for an ordinary laptop is up to 180 days.
 *
 * So "revoke this person's access now" is two steps, not one: suspend the
 * user, then expire or delete their devices. This action reports how many
 * devices they have precisely because the number is the part people miss —
 * a suspension alone can leave a departed employee's laptop on the network
 * for months.
 *
 * ## Restoring is genuinely symmetrical
 *
 * `/restore` puts them back with their devices and role intact, so this is
 * safe to use for a leave of absence rather than only for a departure.
 */
const action: ActionDefinition = {
  key: "user-suspend",
  type: "perform",
  resource: "user",
  title: "Suspend or restore a user",
  description:
    "Stop a person authenticating, or let them back. Their EXISTING DEVICES KEEP WORKING until " +
    "their keys expire — up to 180 days, or never for a tagged machine — so full offboarding is " +
    "this plus expiring those devices, and the count comes back here.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `user-list`. Not the login name.",
    },
    {
      key: "suspended",
      label: "Suspended",
      type: "boolean",
      default: true,
      hint: "Off restores them, with devices and role intact.",
    },
  ],
  output: [
    { key: "userId", type: "string", label: "Which user" },
    { key: "loginName", type: "string", label: "Who they are" },
    { key: "suspended", type: "boolean", label: "What they are now" },
    { key: "changed", type: "boolean", label: "Whether this call changed anything" },
    { key: "deviceCount", type: "number", label: "Devices still working until their keys expire" },
    { key: "role", type: "string", label: "What they could do" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    const suspended = p.suspended !== false;

    const client = new TailscaleClient(ctx);
    const before = await client.request<{
      loginName?: string;
      status?: string;
      role?: string;
      deviceCount?: number;
    }>(`/users/${encodeURIComponent(userId)}`);
    const was = before?.status === "suspended";

    await client.request(
      `/users/${encodeURIComponent(userId)}/${suspended ? "suspend" : "restore"}`,
      { method: "POST" },
    );

    const deviceCount = Number(before?.deviceCount ?? 0);
    if (suspended && deviceCount > 0) {
      ctx.log(
        "warn",
        "this user is suspended and their devices are still on the tailnet — a node key lasts " +
          "up to 180 days, and a tagged device's key does not expire at all. Expiring or " +
          "deleting them is the other half of offboarding",
        { userId, deviceCount },
      );
    }

    return {
      userId,
      loginName: before?.loginName,
      suspended,
      changed: was !== suspended,
      deviceCount,
      role: before?.role,
    };
  },
};

export default action;
