import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `GET /api/systemusers/{id}/sshkeys` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`sshkey_list`).
 *
 * These are the keys JumpCloud pushes to every device the user is bound to, so
 * the list is an access inventory: a key here is shell access to the fleet.
 * Note the response carries the **public** key only — JumpCloud never had the
 * private half.
 */
const action: ActionDefinition = {
  key: "user-sshkey-list",
  type: "read",
  resource: "user",
  title: "List a user's SSH keys",
  description: "List the public SSH keys JumpCloud pushes to this user's devices.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");

    ctx.log("info", "listing a JumpCloud user's SSH keys", { id });

    return await new JumpCloudClient(ctx).request(
      `/systemusers/${encodeURIComponent(id)}/sshkeys`,
    );
  },
};

export default action;
