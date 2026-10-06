import type { ActionDefinition } from "@w6w/types";
import { compact, EdenClient } from "../lib/client.ts";
import { shapeVideo, type VideoBody } from "../lib/video.ts";

/** `GET /v3/videos` - cursor-paged, newest first: pass the previous page's `last_id` as `after`. */
interface Input {
  limit?: number;
  after?: string;
}

const videoList: ActionDefinition<Input> = {
  key: "video-list",
  type: "search",
  resource: "video",
  title: "List Videos",
  description: "List your video generation jobs, newest first.",
  params: [
    {
      key: "limit",
      label: "Max jobs",
      type: "number",
      default: 20,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "after",
      label: "After (cursor)",
      type: "string",
      hint: "The Last ID from the previous page.",
    },
  ],
  output: [
    { key: "videos", type: "array", label: "Video jobs" },
    { key: "hasMore", type: "boolean", label: "More pages exist" },
    { key: "lastId", type: "string", label: "Last ID (pass as After for the next page)" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<
      { data?: VideoBody[]; has_more?: boolean; last_id?: string | null }
    >("/videos", { query: compact({ limit: input.limit ?? 20, after: input.after }) });
    return {
      videos: (res.data ?? []).map(shapeVideo),
      hasMore: res.has_more ?? false,
      lastId: res.last_id ?? undefined,
    };
  },
};

export default videoList;
