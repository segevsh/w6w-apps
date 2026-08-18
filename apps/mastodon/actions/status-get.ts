import type { ActionDefinition } from "@w6w/types";
import { MastodonClient, stripHtml } from "../lib/client.ts";

/**
 * `GET /api/v1/statuses/{id}` — one status.
 *
 * ## `content` is HTML
 *
 * Not plain text. It arrives as `<p>hello <a href="…">#tag</a></p>`, so a
 * workflow matching on it, or forwarding it to a chat integration, gets markup.
 * `text` here is the stripped form, with the original left intact.
 *
 * ## Ids are local to the instance
 *
 * A status id means something on the server that issued it and nothing
 * anywhere else. The same post fetched through two instances has two different
 * ids; the `uri` is the stable, federated identity. Storing ids across
 * instances is how a workflow ends up fetching an unrelated post.
 */
const action: ActionDefinition = {
  key: "status-get",
  type: "read",
  resource: "status",
  title: "Get a status",
  description:
    "One status. `content` is HTML, not text — the stripped form is returned alongside — and the " +
    "id is local to this instance while `uri` is the federated identity.",
  params: [
    {
      key: "id",
      label: "Status",
      type: "string",
      required: true,
      default: "",
      hint: "An id from this instance. Ids are not portable between servers.",
    },
  ],
  output: [
    { key: "status", type: "object", label: "The status" },
    { key: "text", type: "string", label: "`content` with the HTML stripped" },
    { key: "uri", type: "string", label: "The federated identity, stable across instances" },
    { key: "url", type: "string", label: "Its public URL" },
    { key: "author", type: "string", label: "The full `user@domain` handle" },
    { key: "counts", type: "object", label: "Replies, boosts and favourites" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const status = await new MastodonClient(ctx).request<{
      content?: string;
      uri?: string;
      url?: string;
      account?: { acct?: string };
      replies_count?: number;
      reblogs_count?: number;
      favourites_count?: number;
    }>(`/api/v1/statuses/${encodeURIComponent(id)}`);

    return {
      status,
      text: stripHtml(status?.content),
      uri: status?.uri,
      url: status?.url,
      author: status?.account?.acct,
      counts: {
        replies: status?.replies_count ?? 0,
        boosts: status?.reblogs_count ?? 0,
        favourites: status?.favourites_count ?? 0,
      },
    };
  },
};

export default action;
