import type { ActionDefinition } from "@w6w/types";
import { MastodonClient } from "./client.ts";

/**
 * Favourites and boosts are **verbs on a status**, not records you hold.
 *
 * This is the opposite of the AT Protocol, and worth stating because the pack
 * now has both. On Mastodon there is no separate object to keep track of:
 * `POST /api/v1/statuses/{id}/favourite` returns the *status*, with
 * `favourited: true` on its `viewer`-equivalent fields. Undoing it is
 * `/unfavourite` on the same status id.
 *
 * So the id a caller needs is always the status's, both ways round — no
 * bookkeeping, and no chance of the like-versus-post confusion that shape
 * causes elsewhere.
 *
 * Both directions are naturally idempotent: favouriting twice leaves one
 * favourite, and the counts in the returned status say what actually happened.
 */
export function interaction(options: {
  key: string;
  path: string;
  flag: "favourited" | "reblogged";
  countField: "favourites_count" | "reblogs_count";
  verb: string;
  title: string;
  description: string;
  undo: boolean;
}): ActionDefinition {
  return {
    key: options.key,
    type: "perform",
    resource: options.flag === "favourited" ? "favourite" : "boost",
    title: options.title,
    description: options.description,
    // Doing it twice leaves one, unlike a record-based network.
    idempotent: true,
    params: [
      {
        key: "id",
        label: "Status",
        type: "string",
        required: true,
        default: "",
        hint: "The status's own id — the same one both ways round, because there is no separate " +
          "record to address.",
      },
    ],
    output: [
      { key: "id", type: "string", label: "The status" },
      { key: "active", type: "boolean", label: `Whether it is now ${options.verb}d` },
      { key: "count", type: "number", label: "The status's count afterwards" },
      { key: "changed", type: "boolean", label: "Whether this call actually changed anything" },
    ],

    async execute(input, ctx) {
      const p = input as Record<string, unknown>;
      const id = String(p.id ?? "").trim();
      if (!id) throw new Error("`id` is required");

      const status = await new MastodonClient(ctx).request<Record<string, unknown>>(
        `/api/v1/statuses/${encodeURIComponent(id)}/${options.path}`,
        { method: "POST" },
      );

      const active = status?.[options.flag] === true;
      // Mastodon returns the status either way, so "did this change anything"
      // is answerable rather than assumed.
      const changed = active === !options.undo;

      ctx.log("info", `${options.undo ? "un" : ""}${options.verb}d a Mastodon status`, {
        id,
        changed,
      });

      return {
        id,
        active,
        count: Number(status?.[options.countField] ?? 0),
        changed,
      };
    },
  };
}
