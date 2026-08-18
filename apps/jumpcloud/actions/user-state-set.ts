import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/state/activate` and `…/state/suspend` (V1) —
 * verified against JumpCloud's V1 OpenAPI document (`systemusers_state_activate`,
 * `systemusers_state_suspend`).
 *
 * **This is the offboarding verb.** Suspending revokes authentication
 * everywhere JumpCloud is the identity provider — devices, SSO, LDAP, RADIUS —
 * while the account, its groups and its bindings stay intact, so the person can
 * be brought back or their data handed over. `user-delete` is the one that
 * cannot be undone.
 *
 * Two dedicated endpoints rather than a `state` field on the PUT: the PUT
 * accepts `state` too, but these are the transitions JumpCloud models
 * explicitly, and they are what a workflow reaching for "disable this account"
 * means.
 *
 * `STAGED` is deliberately not offered here. It is a creation state — moving a
 * live account back to staged is not a transition JumpCloud gives an endpoint
 * for, and pretending otherwise through the PUT would hide that.
 */
const action: ActionDefinition = {
  key: "user-state-set",
  type: "perform",
  resource: "user",
  title: "Activate or suspend a user",
  description: "Turn a user's access on or off without deleting the account.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "state",
      label: "State",
      type: "select",
      required: true,
      default: "suspend",
      options: [
        { value: "suspend", label: "Suspend — revoke access, keep the account" },
        { value: "activate", label: "Activate — restore access" },
      ],
    },
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "state", type: "string", label: "The transition applied" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");
    const state = String(p.state ?? "suspend");
    if (state !== "suspend" && state !== "activate") {
      throw new Error("`state` must be `suspend` or `activate`");
    }

    ctx.log("info", "changing a JumpCloud user's state", { id, state });

    await new JumpCloudClient(ctx).request(
      `/systemusers/${encodeURIComponent(id)}/state/${state}`,
      { method: "POST" },
    );
    return { userId: id, state };
  },
};

export default action;
