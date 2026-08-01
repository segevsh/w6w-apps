import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";

interface Input {
  tweetId: string;
}

interface MeResponse {
  data: { id: string };
}

interface LikeResponse {
  data: { liked: boolean };
}

/**
 * `POST /2/users/:id/likes` (tweet.read + users.read + like.write). X scopes
 * this endpoint to the acting user's own ID rather than accepting one in the
 * body, so this first resolves it via `GET /2/users/me` (users.read) and then
 * likes on that user's behalf — the same two-call shape X's own docs and
 * every third-party client use for this endpoint.
 */
const tweetLike: ActionDefinition<Input, LikeResponse["data"]> = {
  key: "tweet-like",
  type: "perform",
  resource: "tweet",
  title: "Like Tweet",
  description: "Like a tweet as the authenticated user.",
  // Liking an already-liked tweet is a no-op that still returns `liked: true`.
  idempotent: true,
  params: [
    { key: "tweetId", label: "Tweet ID", type: "string", required: true },
  ],
  output: [
    { key: "liked", type: "boolean", label: "Liked" },
  ],

  async execute(input, ctx) {
    const client = new TwitterClient(ctx);
    const me = await client.request<MeResponse>("/users/me");
    const res = await client.request<LikeResponse>(`/users/${me.data.id}/likes`, {
      method: "POST",
      body: { tweet_id: input.tweetId },
    });
    return res.data;
  },
};

export default tweetLike;
