import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";
import { joinFields, tweetFields } from "../lib/params.ts";

interface Input {
  userId: string;
  maxResults?: number;
  tweetFields?: string[];
}

interface UserTweetsResponse {
  data?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
}

/**
 * `GET /2/users/:id/tweets` (tweet.read + users.read) — takes the numeric
 * user ID, not the @handle; chain "Get User by Username" first to resolve
 * one. Billed per post read under X's pay-per-use pricing — see README.
 */
const userGetTweets: ActionDefinition<Input, UserTweetsResponse> = {
  key: "user-get-tweets",
  type: "search",
  resource: "user",
  title: "Get User's Tweets",
  description: "List a user's recent tweets.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: 'Numeric X user ID — use "Get User by Username" to resolve a @handle first.',
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      default: 10,
      validation: { min: 5, max: 100, integer: true },
    },
    tweetFields,
  ],
  output: [
    { key: "data", type: "array", label: "Tweets" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new TwitterClient(ctx).request<UserTweetsResponse>(`/users/${input.userId}/tweets`, {
      query: {
        max_results: input.maxResults,
        "tweet.fields": joinFields(input.tweetFields),
      },
    });
  },
};

export default userGetTweets;
