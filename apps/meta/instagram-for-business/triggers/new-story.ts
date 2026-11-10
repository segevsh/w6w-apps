import type { TriggerDefinition } from "@w6w/types";
import listStories from "../actions/list-stories.ts";
import { idField, newRecords } from "../lib/triggers.ts";

/**
 * `GET /{ig-user-id}/stories` returns only the stories live right now (they expire after 24 hours,
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/stories,
 * verified 2026-11-10), a small bounded set with no order or filter. Every check reads it through
 * `list-stories` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition<{ igUserId: string }> = {
  key: "new-story",
  title: "New Story",
  description: "The run gets each new Instagram story as it appears on the account.",
  params: [{
    key: "igUserId",
    label: "Instagram Account ID",
    type: "string",
    required: true,
    hint: "The professional account whose stories to watch (from List Instagram Accounts).",
  }],
  output: [
    { key: "id", type: "string", label: "Story media ID" },
    { key: "media_type", type: "string", label: "Media type" },
    { key: "media_url", type: "string", label: "Media URL" },
    { key: "permalink", type: "string", label: "Permalink" },
    { key: "timestamp", type: "string", label: "Posted at" },
  ],
  sample: {
    id: "17900000000000002",
    media_type: "IMAGE",
    media_url: "https://graph.facebook.com/story-sample.jpg",
    permalink: "https://graph.facebook.com/story-sample-permalink",
    timestamp: "2026-11-10T09:00:00+0000",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const res = await listStories.execute({ igUserId: params.igUserId }, ctx);
    return newRecords({ state, items: res.data ?? [], idOf: idField, what: "a story" });
  },
};

export default trigger;
