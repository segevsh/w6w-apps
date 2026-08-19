import type { ActionDefinition } from "@w6w/types";
import { query, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/tailnet/{tailnet}/users` — who is in the tailnet, and in what
 * state.
 *
 * ## The status enum is the useful part, and two of its values are not about people
 *
 * Tailscale's own definitions:
 *
 * - `active` — seen within 28 days.
 * - `idle` — not seen for longer than that. A licence being paid for and not used.
 * - `suspended` — cut off from the tailnet, still listed.
 * - `needs-approval` — **cannot join until somebody approves them**.
 * - `over-billing-limit` — **cannot join because the plan's user count is full**.
 *
 * The last two are the ones worth alerting on. Somebody in either state has a
 * working login, no access, and no error that explains why — and the fix for
 * one is an admin clicking approve while the fix for the other is a purchase
 * order.
 *
 * ## `shared` users are not your users
 *
 * A user shared in from another tailnet appears here with `type: "shared"`.
 * They are somebody else's employee with access to one device, and counting
 * them as staff makes an access review wrong in the direction that matters.
 * This action asks for members only by default.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List users",
  description:
    "Who is in the tailnet and in what state — including the two states that mean someone is " +
    "LOCKED OUT with no error to explain it: awaiting approval, and blocked by the plan's user " +
    "limit. Separates shared users, who are somebody else's staff.",
  params: [
    {
      key: "type",
      label: "Which users",
      type: "select",
      default: "member",
      options: [
        { value: "member", label: "Members — your own tailnet's users" },
        { value: "shared", label: "Shared in from other tailnets" },
        { value: "all", label: "Both" },
      ],
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "Any role" },
        { value: "owner", label: "Owner" },
        { value: "admin", label: "Admin" },
        { value: "it-admin", label: "IT admin" },
        { value: "network-admin", label: "Network admin" },
        { value: "billing-admin", label: "Billing admin" },
        { value: "auditor", label: "Auditor" },
        { value: "member", label: "Member" },
      ],
    },
  ],
  output: [
    { key: "users", type: "array", label: "The users" },
    { key: "count", type: "number", label: "How many" },
    { key: "blocked", type: "array", label: "Cannot join — approval or the billing limit" },
    { key: "suspended", type: "array", label: "Cut off, and still listed" },
    { key: "idle", type: "array", label: "Not seen in 28 days" },
    { key: "admins", type: "array", label: "Anyone above plain member" },
    { key: "deviceCounts", type: "object", label: "Devices per user" },
    { key: "sharedCount", type: "number", label: "Users from other tailnets" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);

    const body = await new TailscaleClient(ctx).request<{
      users?: Array<{
        id?: string;
        displayName?: string;
        loginName?: string;
        role?: string;
        status?: string;
        type?: string;
        deviceCount?: number;
        lastSeen?: string;
      }>;
    }>(`/tailnet/${encodeURIComponent(tailnet)}/users`, {
      query: query({
        type: String(p.type ?? "member"),
        role: String(p.role ?? "all"),
      }),
    });

    const users = body?.users ?? [];
    const name = (user: { loginName?: string; displayName?: string }) =>
      user?.loginName ?? user?.displayName ?? "(unnamed)";

    // A working login, no access, and nothing that says why.
    const blocked = users.filter((user) =>
      user?.status === "needs-approval" || user?.status === "over-billing-limit"
    );
    if (blocked.length) {
      ctx.log(
        "warn",
        "some users cannot join the tailnet — awaiting approval, or over the plan's user limit. " +
          "Both look to the user like Tailscale simply not working",
        { blocked: blocked.length },
      );
    }

    const deviceCounts: Record<string, number> = {};
    for (const user of users) {
      if (typeof user?.deviceCount === "number") deviceCounts[name(user)] = user.deviceCount;
    }

    return {
      users,
      count: users.length,
      blocked: blocked.map((user) => ({ user: name(user), status: user?.status })),
      suspended: users.filter((user) => user?.status === "suspended").map(name),
      idle: users.filter((user) => user?.status === "idle").map(name),
      admins: users
        .filter((user) => user?.role && user.role !== "member")
        .map((user) => ({ user: name(user), role: user?.role })),
      deviceCounts,
      sharedCount: users.filter((user) => user?.type === "shared").length,
    };
  },
};

export default action;
