import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postsForChannel from "../actions/posts-for-channel.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly created post.",
  action: postsForChannel as unknown as ActionDefinition,
  input: (params) => ({
    channelId: (params as { channelId: string }).channelId,
    page: 0,
    perPage: 100,
    since: 0,
  }),
  items: (r) => Object.values((r as { posts?: Record<string, unknown> }).posts ?? {}),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "channelId", label: "Channel ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "New Post ID" }],
  sample: { id: "example-1" },
  maxPages: 1,
});
