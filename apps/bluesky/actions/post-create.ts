import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, compact, csv, json, nowIso, postUri } from "../lib/client.ts";
import { buildFacets, checkLength, graphemeCount } from "../lib/richtext.ts";

/**
 * `com.atproto.repo.createRecord` for `app.bsky.feed.post` — write a post.
 *
 * ## Facets, which is the whole reason this action is not three lines
 *
 * Bluesky does **not** parse your text. A URL posted without a matching facet
 * renders as plain grey characters; a `@handle` is not a mention; a `#tag` is
 * not a tag. Nothing errors — the post exists, the response looks right, and it
 * is inert everywhere.
 *
 * This action detects links, mentions and tags and builds the `facets` array
 * with correct **UTF-8 byte** offsets. See `lib/richtext.ts` for why the byte
 * part matters: JavaScript string indices are UTF-16, so any emoji or accented
 * character before a link shifts every offset and the highlight lands inside
 * the URL — a bug that works perfectly until someone writes in French.
 *
 * A mention needs the account's DID, which the text does not contain, so
 * handles are resolved. A handle that no longer exists is left as plain text
 * and reported in `unresolvedMentions`, rather than failing the post — somebody
 * deleting their account should not break a scheduled post that mentioned them.
 *
 * ## Two limits, in two different units
 *
 * The lexicon says `maxGraphemes: 300` **and** `maxLength: 3000`. Graphemes are
 * what a person calls characters (a skin-toned emoji is one); the 3000 is
 * bytes. Both are checked before the write.
 *
 * ## Replying takes two references, and they are not the same one
 *
 * A reply carries `root` (the top of the thread) and `parent` (what is being
 * replied to). For a direct reply to a top-level post they are equal; deeper in
 * a thread they are not, and setting `root` to the parent detaches the reply
 * into its own thread. Give `replyTo` and this action fetches the parent's own
 * reply reference to get `root` right.
 */
const action: ActionDefinition = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create a post",
  description:
    "Post to Bluesky. Links, mentions and hashtags are detected and turned into real facets — " +
    "without them Bluesky renders them as plain text, silently.",
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      default: "",
      hint:
        "Up to 300 graphemes and 3000 bytes. Links, @handles and #tags become live automatically.",
    },
    {
      key: "replyTo",
      label: "Reply To",
      type: "string",
      default: "",
      hint: "An AT-URI or a bsky.app post link. The thread root is worked out from it — setting " +
        "it by hand is how a reply ends up detached into its own thread.",
    },
    {
      key: "langs",
      label: "Languages",
      type: "string",
      default: "",
      hint:
        "Comma-separated BCP-47 codes, up to 3. Drives translation offers and language filters.",
    },
    {
      key: "embed",
      label: "Embed",
      type: "json",
      default: "",
      advanced: true,
      hint: "A raw embed record — images (with blobs from `blob-upload`), an external link card, " +
        "or a quoted post.",
    },
    {
      key: "quotePost",
      label: "Quote Post",
      type: "string",
      default: "",
      hint: "An AT-URI or bsky.app link to quote. Builds the embed for you.",
    },
    {
      key: "detectFacets",
      label: "Detect Links And Mentions",
      type: "boolean",
      default: true,
      hint: "Off means the text posts exactly as typed, with every URL inert. Only turn it off " +
        "if you are supplying `facets` yourself.",
    },
    {
      key: "facets",
      label: "Facets",
      type: "json",
      default: "",
      advanced: true,
      hint: "Supply the annotations yourself. Replaces detection entirely; indices are UTF-8 " +
        "byte offsets, not string indices.",
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "string",
      default: "",
      advanced: true,
      hint: "ISO 8601. Client-declared, so it is what clients sort by — defaults to now.",
    },
  ],
  output: [
    { key: "uri", type: "string", label: "The post's AT-URI" },
    { key: "cid", type: "string", label: "Its content hash" },
    { key: "url", type: "string", label: "The bsky.app link a person can open" },
    { key: "facetCount", type: "number", label: "Links, mentions and tags made live" },
    { key: "unresolvedMentions", type: "array", label: "Handles that no longer resolve" },
    { key: "graphemes", type: "number", label: "Length, in the unit the limit uses" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const text = String(p.text ?? "");
    const embed = json(p.embed, "embed") as Record<string, unknown> | undefined;
    if (!text.trim() && !embed) {
      throw new Error("`text` is required, unless the post carries an embed");
    }
    checkLength(text);

    const client = new BlueskyClient(ctx);

    // Supplied facets replace detection entirely — mixing the two would
    // produce overlaps, which the PDS rejects.
    const supplied = json(p.facets, "facets") as unknown[] | undefined;
    let facets: unknown[] = supplied ?? [];
    let unresolved: string[] = [];
    if (!supplied && p.detectFacets !== false) {
      const built = await buildFacets(text, async (handle) => {
        try {
          const result = await client.call<{ did?: string }>(
            "com.atproto.identity.resolveHandle",
            { query: { handle } },
          );
          return result?.did;
        } catch {
          // A handle that has gone is plain text, not a failed post.
          return undefined;
        }
      });
      facets = built.facets;
      unresolved = built.unresolved;
    }

    const record: Record<string, unknown> = compact({
      $type: "app.bsky.feed.post",
      text,
      facets,
      langs: csv(p.langs)?.slice(0, 3),
      createdAt: String(p.createdAt ?? "").trim() || nowIso(),
    });

    const replyTo = String(p.replyTo ?? "").trim();
    if (replyTo) record.reply = await buildReply(client, replyTo);

    const quote = String(p.quotePost ?? "").trim();
    if (quote && embed) {
      throw new Error("give either `quotePost` or a raw `embed`, not both");
    }
    if (quote) {
      const target = postUri(quote, "quotePost");
      const found = await client.call<{ posts?: Array<{ uri?: string; cid?: string }> }>(
        "app.bsky.feed.getPosts",
        { query: { uris: target.uri } },
      );
      const post = found?.posts?.[0];
      if (!post?.cid) throw new Error(`could not find the post to quote: ${target.uri}`);
      record.embed = {
        $type: "app.bsky.embed.record",
        record: { uri: post.uri, cid: post.cid },
      };
    } else if (embed) {
      record.embed = embed;
    }

    const created = await client.createRecord<{ uri: string; cid: string }>(
      "app.bsky.feed.post",
      record,
    );

    // The counts and the URI, never the text — a post is the caller's content.
    ctx.log("info", "created a Bluesky post", {
      facets: facets.length,
      unresolvedMentions: unresolved.length,
      reply: Boolean(replyTo),
    });

    return {
      ...created,
      url: webUrl(created.uri),
      facetCount: facets.length,
      unresolvedMentions: unresolved,
      graphemes: graphemeCount(text),
    };
  },
};

/**
 * Work out the `root`/`parent` pair for a reply.
 *
 * The parent's own record carries its `reply.root` when it is itself a reply.
 * Using it is the difference between a reply that joins the thread and one that
 * starts a new one that looks broken to everybody.
 */
async function buildReply(
  client: BlueskyClient,
  target: string,
): Promise<Record<string, unknown>> {
  const parsed = postUri(target, "replyTo");
  const found = await client.call<{
    posts?: Array<{
      uri?: string;
      cid?: string;
      record?: { reply?: { root?: { uri?: string; cid?: string } } };
    }>;
  }>("app.bsky.feed.getPosts", { query: { uris: parsed.uri } });

  const post = found?.posts?.[0];
  if (!post?.cid) throw new Error(`could not find the post to reply to: ${parsed.uri}`);
  const parent = { uri: post.uri, cid: post.cid };
  // A top-level post is its own root.
  const root = post.record?.reply?.root ?? parent;
  return { root, parent };
}

/** The link a person can open, derived from the AT-URI. */
export function webUrl(uri: string): string | undefined {
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/]+)$/.exec(uri);
  if (!match) return undefined;
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

export default action;
