import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, nowIso, parseAtUri, postUri } from "./client.ts";

/**
 * Likes and reposts are **records that point at a post**, not flags on it.
 *
 * This is the single most common source of confusion in the AT Protocol, and it
 * is worth being precise about. Liking creates an `app.bsky.feed.like` record in
 * *your* repository whose `subject` is the post's URI and CID. Unliking deletes
 * **that like record**, addressed by its own AT-URI — which is a completely
 * different URI from the post's, and lives in your repo rather than the
 * author's.
 *
 * So:
 *
 *     post   at://did:plc:AUTHOR/app.bsky.feed.post/3k2a...
 *     like   at://did:plc:YOU/app.bsky.feed.like/3k9z...
 *
 * Passing the post URI to a delete gets `InvalidRequest: record not found`,
 * which reads like the post is gone. `like-create` therefore returns the like's
 * own URI prominently, and `like-delete` accepts **either**: the like URI
 * directly, or the post URI, in which case it looks up the existing like via
 * the post's `viewer.like` and deletes that.
 *
 * The same is true of reposts, and of follows — a follow is a record in your
 * repo pointing at a DID.
 */

/** The CID a `subject` needs alongside the URI. */
export async function subjectFor(
  client: BlueskyClient,
  uri: unknown,
  field: string,
): Promise<{ uri: string; cid: string; viewer?: { like?: string; repost?: string } }> {
  const target = postUri(uri, field);
  const found = await client.call<{
    posts?: Array<{ uri?: string; cid?: string; viewer?: { like?: string; repost?: string } }>;
  }>("app.bsky.feed.getPosts", { query: { uris: target.uri } });

  const post = found?.posts?.[0];
  if (!post?.cid) {
    throw new Error(
      `could not find that post: ${target.uri}. It may be deleted, or from an account that ` +
        "blocks this one",
    );
  }
  // The CID pins the exact version — a subject without it is rejected.
  return { uri: String(post.uri), cid: post.cid, viewer: post.viewer };
}

/** Build the create action for a like or a repost, which differ only in names. */
export function interactionCreate(options: {
  key: string;
  collection: string;
  verb: string;
  title: string;
  description: string;
  viewerField: "like" | "repost";
}): ActionDefinition {
  return {
    key: options.key,
    type: "perform",
    resource: options.viewerField,
    title: options.title,
    description: options.description,
    // Doing it twice makes a SECOND record; the first is then orphaned and the
    // count is unaffected, so it is not idempotent in any useful sense.
    idempotent: false,
    params: [
      {
        key: "uri",
        label: "Post",
        type: "string",
        required: true,
        default: "",
        hint: "An AT-URI or a bsky.app link.",
      },
    ],
    output: [
      { key: "uri", type: "string", label: `The ${options.verb} record's OWN URI — keep this` },
      { key: "cid", type: "string", label: "Its content hash" },
      { key: "subject", type: "string", label: "The post it points at" },
      { key: "alreadyExisted", type: "boolean", label: "There was already one, now orphaned" },
    ],

    async execute(input, ctx) {
      const client = new BlueskyClient(ctx);
      const p = input as Record<string, unknown>;
      const subject = await subjectFor(client, p.uri, "uri");
      const existing = subject.viewer?.[options.viewerField];

      const created = await client.createRecord<{ uri: string; cid: string }>(options.collection, {
        $type: options.collection,
        subject: { uri: subject.uri, cid: subject.cid },
        createdAt: nowIso(),
      });

      if (existing) {
        ctx.log(
          "warn",
          `this post was already ${options.verb}d — the previous record is now orphaned`,
          { previous: existing },
        );
      }

      return {
        ...created,
        subject: subject.uri,
        alreadyExisted: Boolean(existing),
      };
    },
  };
}

/** Build the delete action, which accepts either URI. */
export function interactionDelete(options: {
  key: string;
  collection: string;
  verb: string;
  title: string;
  description: string;
  viewerField: "like" | "repost";
}): ActionDefinition {
  return {
    key: options.key,
    type: "perform",
    resource: options.viewerField,
    title: options.title,
    description: options.description,
    idempotent: true,
    params: [
      {
        key: "uri",
        label: `${options.title.replace(/^Un/, "")} or post`,
        type: "string",
        required: true,
        default: "",
        hint: `The ${options.verb} record's own AT-URI, or the post's — given a post, the ` +
          `existing ${options.verb} is looked up and removed.`,
      },
    ],
    output: [
      { key: "deleted", type: "boolean", label: "Removed" },
      { key: "uri", type: "string", label: `The ${options.verb} record that was removed` },
      { key: "wasPresent", type: "boolean", label: "Whether there was one to remove" },
    ],

    async execute(input, ctx) {
      const client = new BlueskyClient(ctx);
      const p = input as Record<string, unknown>;
      const raw = String(p.uri ?? "").trim();

      // Given the record's own URI, delete it directly.
      if (raw.includes(`/${options.collection}/`)) {
        const parsed = parseAtUri(raw, "uri");
        if (parsed.did !== client.did) {
          throw new Error(
            `that ${options.verb} record belongs to ${parsed.did}, not to this connection`,
          );
        }
        await client.deleteRecord(options.collection, parsed.rkey);
        return { deleted: true, uri: raw, wasPresent: true };
      }

      // Given the post, find this account's own record pointing at it.
      const subject = await subjectFor(client, raw, "uri");
      const existing = subject.viewer?.[options.viewerField];
      if (!existing) {
        // Not an error: the desired state is already the actual state.
        return { deleted: false, wasPresent: false };
      }
      const parsed = parseAtUri(existing, "uri");
      await client.deleteRecord(options.collection, parsed.rkey);
      ctx.log("info", `removed a Bluesky ${options.verb}`, { rkey: parsed.rkey });
      return { deleted: true, uri: existing, wasPresent: true };
    },
  };
}
