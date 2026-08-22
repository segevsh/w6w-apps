import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, postUri, query } from "../lib/client.ts";

/**
 * `app.bsky.feed.getPostThread` — a post with its ancestors and replies.
 *
 * ## The response is a recursive union, and two of its arms are not posts
 *
 * Every node is one of `threadViewPost` (a real post, with `parent` and
 * `replies`), `notFoundPost`, or `blockedPost`. Walking the tree and reading
 * `node.post.record.text` therefore throws on a perfectly normal thread that
 * happens to contain a blocked account — and blocks are common. The `$type`
 * discriminator has to be checked at every node.
 *
 * This action walks it once and returns a flattened list of the real posts
 * alongside counts of what was not readable, so the common case does not
 * require a recursive walk in a workflow.
 *
 * ## `depth` and `parentHeight` go in opposite directions
 *
 * `depth` is how far down into replies to go; `parentHeight` is how far up
 * toward the thread root. Asking for a deep thread is expensive and the server
 * truncates rather than refusing, so a missing reply may just be past the
 * horizon.
 */
const action: ActionDefinition = {
  key: "thread-get",
  type: "read",
  resource: "post",
  title: "Get a thread",
  description:
    "A post with its ancestors and replies. Blocked and deleted nodes appear as their own kinds " +
    "rather than as posts — they are counted here instead of crashing a walk.",
  params: [
    {
      key: "uri",
      label: "Post",
      type: "string",
      required: true,
      default: "",
      hint: "An AT-URI or bsky.app link — any post in the thread.",
    },
    {
      key: "depth",
      label: "Reply Depth",
      type: "number",
      default: 6,
      hint: "How far down into replies. 0 to 1000; the server truncates deep threads silently.",
    },
    {
      key: "parentHeight",
      label: "Ancestor Height",
      type: "number",
      default: 80,
      hint: "How far UP toward the thread root — the opposite direction from depth.",
    },
  ],
  output: [
    { key: "thread", type: "object", label: "The raw tree" },
    { key: "posts", type: "array", label: "Every readable post, flattened" },
    { key: "count", type: "number", label: "Readable posts" },
    { key: "blocked", type: "number", label: "Nodes hidden by a block" },
    { key: "notFound", type: "number", label: "Nodes deleted or unavailable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const target = postUri(p.uri, "uri");

    const result = await new BlueskyClient(ctx).call<{ thread?: ThreadNode }>(
      "app.bsky.feed.getPostThread",
      {
        query: query({
          uri: target.uri,
          depth: Math.max(0, Number(p.depth ?? 6)),
          parentHeight: Math.max(0, Number(p.parentHeight ?? 80)),
        }),
      },
    );

    const walked = walk(result?.thread);
    ctx.log("info", "read a Bluesky thread", {
      count: walked.posts.length,
      blocked: walked.blocked,
      notFound: walked.notFound,
    });

    return {
      thread: result?.thread,
      posts: walked.posts,
      count: walked.posts.length,
      blocked: walked.blocked,
      notFound: walked.notFound,
    };
  },
};

interface ThreadNode {
  $type?: string;
  post?: unknown;
  parent?: ThreadNode;
  replies?: ThreadNode[];
}

/**
 * Flatten the tree, counting the arms that are not posts.
 *
 * The `$type` check is the point: `blockedPost` and `notFoundPost` have no
 * `post` field at all.
 */
export function walk(node: ThreadNode | undefined): {
  posts: unknown[];
  blocked: number;
  notFound: number;
} {
  const posts: unknown[] = [];
  let blocked = 0;
  let notFound = 0;

  const visit = (current: ThreadNode | undefined) => {
    if (!current) return;
    const type = String(current.$type ?? "");
    if (type.endsWith("#blockedPost")) {
      blocked++;
      return;
    }
    if (type.endsWith("#notFoundPost")) {
      notFound++;
      return;
    }
    if (current.post) posts.push(current.post);
    visit(current.parent);
    for (const reply of current.replies ?? []) visit(reply);
  };

  visit(node);
  return { posts, blocked, notFound };
}

export default action;
