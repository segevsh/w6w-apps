import type { ActionDefinition } from "@w6w/types";
import { compact, MastodonClient } from "../lib/client.ts";

/**
 * `POST /api/v1/accounts/{id}/follow` — follow an account.
 *
 * ## Following a locked account is a *request*
 *
 * The response's `requested: true` means the follow is pending the other
 * person's approval and `following` is still false. Nothing errors, and a
 * workflow reading `following` sees false and may try again forever. Both
 * fields come back here.
 *
 * ## The two options that people forget exist
 *
 * `reblogs` decides whether their boosts appear in your timeline — off is how
 * to follow somebody whose own posts you want and whose boosting habit you do
 * not. `notify` sends you a notification for each of their posts, which is the
 * "bell" in the web UI.
 *
 * Both default to Mastodon's own defaults here rather than being imposed.
 */
const action: ActionDefinition = {
  key: "account-follow",
  type: "perform",
  resource: "follow",
  title: "Follow an account",
  description:
    "Follow someone. For a locked account this is a REQUEST — `requested` comes back true and " +
    "`following` stays false until they approve.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Account",
      type: "string",
      required: true,
      default: "",
      hint: "An account id from `account-lookup`.",
    },
    {
      key: "reblogs",
      label: "Show Their Boosts",
      type: "boolean",
      default: true,
      hint: "Off follows the person without their boosts filling your timeline.",
    },
    {
      key: "notify",
      label: "Notify On Every Post",
      type: "boolean",
      default: false,
      hint: "The bell icon in the web UI.",
    },
  ],
  output: [
    { key: "following", type: "boolean", label: "Whether the follow is live" },
    { key: "requested", type: "boolean", label: "Whether it is awaiting approval" },
    { key: "id", type: "string", label: "The account" },
    { key: "relationship", type: "object", label: "The full relationship object" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const relationship = await new MastodonClient(ctx).request<{
      following?: boolean;
      requested?: boolean;
    }>(`/api/v1/accounts/${encodeURIComponent(id)}/follow`, {
      method: "POST",
      body: compact({
        reblogs: p.reblogs === false ? false : undefined,
        notify: p.notify === true ? true : undefined,
      }),
    });

    const requested = relationship?.requested === true;
    if (requested) {
      ctx.log("info", "follow request sent — awaiting approval, not yet following", { id });
    }

    return {
      following: relationship?.following === true,
      // The field that stops a workflow retrying forever.
      requested,
      id,
      relationship,
    };
  },
};

export default action;
