import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import commentReplyList from "../actions/comment-reply-list.ts";

/** Pages read per check; a comment thread longer than this fails the check loudly. */
const MAX_PAGES = 5;

/**
 * `GET /videos/{video}/comments/{comment}/replies` documents only `page` and `per_page` (no sort or
 * direction), per https://developer.vimeo.com/api/reference/videos (2026-11-10), so newest replies
 * cannot be read first. A thread is short and bounded, so each check reads it whole (up to
 * `MAX_PAGES` x 100) through `comment-reply-list` and diffs reply URIs against the previous check
 * (`pollSnapshot`, hashes only in state).
 */
const trigger: TriggerDefinition = {
  key: "new-comment-reply",
  title: "New Comment Reply",
  description: "The run gets each new reply to one comment on a video.",
  params: [
    {
      key: "videoId",
      label: "Video ID",
      type: "string",
      required: true,
      placeholder: "258684937",
      hint: "The numeric video ID, or a full `/videos/258684937` URI.",
    },
    {
      key: "commentId",
      label: "Comment ID",
      type: "string",
      required: true,
      placeholder: "987",
      hint: "The comment to watch (the uri output of New Comment ends with it).",
    },
  ],
  output: [
    { key: "uri", type: "string", label: "Reply URI" },
    { key: "text", type: "string", label: "Text" },
    { key: "created_on", type: "string", label: "Created" },
    { key: "user", type: "object", label: "Author" },
  ],
  sample: {
    uri: "/videos/258684937/comments/988",
    text: "Agreed!",
    created_on: "2026-11-09T12:05:00+00:00",
    user: { name: "Sam" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx: HookContext) {
    const p = (params ?? {}) as { videoId?: string; commentId?: string };
    const byUri = new Map<string, unknown>();
    for (let page = 1;; page++) {
      const result = await commentReplyList.execute({
        videoId: String(p.videoId ?? ""),
        commentId: String(p.commentId ?? ""),
        page,
        perPage: 100,
      }, ctx);
      for (const item of result.data ?? []) {
        const uri = String((item as { uri?: unknown }).uri ?? "");
        if (!uri) throw new Error("Vimeo reply list returned a reply without a uri");
        byUri.set(uri, item);
      }
      if (!result.paging?.next) break;
      if (page >= MAX_PAGES) {
        throw new Error(`new-comment-reply: more than ${MAX_PAGES} pages of replies`);
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byUri.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byUri.get(e.key)), nextState };
  },
};

export default trigger;
