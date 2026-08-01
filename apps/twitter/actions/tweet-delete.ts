import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";

interface Input {
  tweetId: string;
}

interface DeleteResponse {
  data: { deleted: boolean };
}

/** `DELETE /2/tweets/:id` (tweet.read + tweet.write + users.read). */
const tweetDelete: ActionDefinition<Input, DeleteResponse["data"]> = {
  key: "tweet-delete",
  type: "perform",
  resource: "tweet",
  title: "Delete Tweet",
  description: "Delete a tweet owned by the authenticated user.",
  // Deleting an already-deleted tweet returns `{ deleted: false }` rather than
  // an error, so retrying a delete is safe.
  idempotent: true,
  params: [
    { key: "tweetId", label: "Tweet ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const res = await new TwitterClient(ctx).request<DeleteResponse>(`/tweets/${input.tweetId}`, {
      method: "DELETE",
    });
    return res.data;
  },
};

export default tweetDelete;
