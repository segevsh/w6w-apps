import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, stripHtml } from "../lib/client.ts";

/**
 * `DELETE /api/v1/statuses/{id}` — remove a post.
 *
 * ## Deletion federates as a request, and only to servers that saw it
 *
 * The status goes from your instance immediately. Every *other* instance that
 * received it gets a delete activity and is expected to honour it — most do.
 * But a server that was offline when the delete went out may never process it,
 * and one that never received the original has nothing to delete. On a
 * federated network a delete is a broadcast, not a transaction.
 *
 * ## The response is the deleted status, which is deliberate
 *
 * Mastodon returns the status it just removed, with its `text` field populated
 * — the source text rather than the rendered HTML. That is there so a client
 * can offer "delete and redraft", and it makes this the only way to recover
 * what a post said after removing it.
 */
const action: ActionDefinition = {
  key: "status-delete",
  type: "perform",
  resource: "status",
  title: "Delete a status",
  description:
    "Remove one of your posts. Other instances are SENT a delete and expected to honour it — a " +
    "server that was offline may never process it.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Status",
      type: "string",
      required: true,
      default: "",
      hint: "Must be your own post — the API offers no way to delete anybody else's.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed from this instance" },
    { key: "id", type: "string", label: "What was removed" },
    { key: "text", type: "string", label: "What it said — the only way to recover it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const removed = await new MastodonClient(ctx).request<{ text?: string; content?: string }>(
      `/api/v1/statuses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );

    ctx.log("info", "deleted a Mastodon status", { id });
    return {
      deleted: true,
      id,
      // Mastodon returns the source text here so a client can redraft.
      text: removed?.text ?? stripHtml(removed?.content),
    };
  },
};

export default action;
