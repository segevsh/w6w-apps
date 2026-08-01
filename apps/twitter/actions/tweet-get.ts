import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";
import { joinFields, tweetFields } from "../lib/params.ts";

interface Input {
  tweetId: string;
  tweetFields?: string[];
}

interface TweetResponse {
  data: Record<string, unknown>;
}

/**
 * `GET /2/tweets/:id` (tweet.read + users.read). Billed per X's pay-per-use
 * pricing — see README for current rates.
 */
const tweetGet: ActionDefinition<Input, TweetResponse["data"]> = {
  key: "tweet-get",
  type: "read",
  resource: "tweet",
  title: "Get Tweet",
  description: "Look up a single tweet by ID.",
  params: [
    { key: "tweetId", label: "Tweet ID", type: "string", required: true },
    tweetFields,
  ],
  output: [
    { key: "id", type: "string", label: "Tweet ID" },
    { key: "text", type: "string", label: "Text" },
  ],

  async execute(input, ctx) {
    const res = await new TwitterClient(ctx).request<TweetResponse>(`/tweets/${input.tweetId}`, {
      query: { "tweet.fields": joinFields(input.tweetFields) },
    });
    return res.data;
  },
};

export default tweetGet;
