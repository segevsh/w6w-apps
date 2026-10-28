import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse } from "../lib/client.ts";

interface Input {
  igUserId: string;
  query: string;
}

/**
 * Resolve a hashtag name to its id — `GET /ig_hashtag_search?user_id=&q=`. The id is
 * what the recent/top media edges take. Needs the Instagram Public Content Access
 * feature. An account may query at most 30 unique hashtags per rolling 7 days.
 */
const searchHashtag: ActionDefinition<Input, InstagramListResponse<{ id: string }>> = {
  key: "search-hashtag",
  type: "read",
  resource: "hashtag",
  title: "Search Hashtag",
  description: "Look up the id of a hashtag (without the #) for use with hashtag media actions.",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    { key: "query", label: "Hashtag", type: "string", required: true, hint: "Without the #." },
  ],
  output: [{ key: "data", type: "array", label: "Matches ([{ id }])" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<{ id: string }>>(
      "/ig_hashtag_search",
      { params: { user_id: input.igUserId, q: input.query.replace(/^#/, "") } },
    );
  },
};

export default searchHashtag;
