import type { ActionDefinition } from "@w6w/types";
import { MastodonClient } from "../lib/client.ts";

/**
 * `POST /api/v1/accounts/{id}/unfollow` — stop following.
 *
 * It also withdraws a pending follow request, which is the only way to do that
 * — there is no separate cancel. The relationship comes back either way, so
 * `changed` can say whether there was anything to undo.
 *
 * Unfollowing does not block, mute, or tell the other person. On a locked
 * account it means a future follow needs approving again.
 */
const action: ActionDefinition = {
  key: "account-unfollow",
  type: "perform",
  resource: "follow",
  title: "Unfollow an account",
  description:
    "Stop following, and withdraw a pending request — there is no separate cancel. It does not " +
    "block, mute or notify.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Account",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "following", type: "boolean", label: "Whether the follow is still live" },
    { key: "requested", type: "boolean", label: "Whether a request is still pending" },
    { key: "changed", type: "boolean", label: "Whether there was anything to undo" },
    { key: "id", type: "string", label: "The account" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const relationship = await new MastodonClient(ctx).request<{
      following?: boolean;
      requested?: boolean;
    }>(`/api/v1/accounts/${encodeURIComponent(id)}/unfollow`, { method: "POST" });

    const following = relationship?.following === true;
    const requested = relationship?.requested === true;

    ctx.log("info", "unfollowed a Mastodon account", { id });
    return {
      following,
      requested,
      // Both false afterwards means something was actually undone.
      changed: !following && !requested,
      id,
    };
  },
};

export default action;
