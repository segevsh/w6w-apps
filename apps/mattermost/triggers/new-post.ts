import { sinceTrigger } from "../lib/since.ts";
import postsForChannel from "../actions/posts-for-channel.ts";

interface Post {
  id?: unknown;
  create_at?: unknown;
}

/**
 * `GET /api/v4/channels/{channel_id}/posts?since=<ms>` — every post modified since the cursor,
 * ordered by create time (limit 1000, no paging with `since`). The response is `{order, posts}`:
 * the records are read through `order`, never `Object.values(posts)`. A post that was only EDITED
 * (created before the window) is dropped by its `create_at`; the rest is sorted newest-first.
 */
export default sinceTrigger<{ channelId: string }>({
  key: "new-post",
  title: "New Post",
  description: "The run gets each new post in the channel: its id, author, message and timestamps.",
  action: postsForChannel,
  firstPage: 0,
  request: ({ sinceMs, params }) => ({ channelId: params.channelId, since: sinceMs }),
  items: (result, sinceMs) => {
    const { order, posts } = result as {
      order?: string[];
      posts?: Record<string, Post>;
    };
    const fresh = (order ?? []).map((id) => posts?.[id]).filter((p): p is Post =>
      p !== undefined && typeof p.create_at === "number" && p.create_at >= sinceMs
    );
    // The kit reads pages newest-first; do not rely on the vendor's `order` direction for that.
    return fresh.sort((a, b) => (b.create_at as number) - (a.create_at as number));
  },
  // `since` returns everything in one response (no page/per_page), so never ask for a second page.
  more: () => false,
  idOf: (item) => String((item as Post).id ?? ""),
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "channel_id", type: "string", label: "Channel ID" },
    { key: "user_id", type: "string", label: "Author user ID" },
    { key: "message", type: "string", label: "Message" },
    { key: "create_at", type: "number", label: "Created at (ms)" },
    { key: "update_at", type: "number", label: "Updated at (ms)" },
  ],
  sample: {
    id: "n4bq8s7h8jyz5mdb9crwkw3y1h",
    channel_id: "t3k5ycqxqpbm3d1a6u9tr1e8xo",
    user_id: "6n7ztz3u3pg1md6q4yr5jx9c7e",
    message: "Deploy finished.",
    create_at: 1794700000000,
    update_at: 1794700000000,
  },
});
