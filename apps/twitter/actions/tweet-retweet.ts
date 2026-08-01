import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";

interface Input {
  tweetId: string;
}

interface MeResponse {
  data: { id: string };
}

interface RetweetResponse {
  data: { retweeted: boolean };
}

/**
 * `POST /2/users/:id/retweets` (tweet.read + tweet.write + users.read). Like
 * `tweet-like`, X scopes this to the acting user's own ID, so this resolves
 * it via `GET /2/users/me` first and retweets on that user's behalf.
 */
const tweetRetweet: ActionDefinition<Input, RetweetResponse["data"]> = {
  key: "tweet-retweet",
  type: "perform",
  resource: "tweet",
  title: "Retweet",
  description: "Retweet a tweet as the authenticated user.",
  // Retweeting an already-retweeted tweet is a no-op that still returns `retweeted: true`.
  idempotent: true,
  params: [
    { key: "tweetId", label: "Tweet ID", type: "string", required: true },
  ],
  output: [
    { key: "retweeted", type: "boolean", label: "Retweeted" },
  ],

  async execute(input, ctx) {
    const client = new TwitterClient(ctx);
    const me = await client.request<MeResponse>("/users/me");
    const res = await client.request<RetweetResponse>(`/users/${me.data.id}/retweets`, {
      method: "POST",
      body: { tweet_id: input.tweetId },
    });
    return res.data;
  },
};

export default tweetRetweet;
