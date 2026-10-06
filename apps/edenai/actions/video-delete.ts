import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/** `DELETE /v3/videos/{video_id}` - finished jobs only; one still in progress is refused. */
interface Input {
  videoId: string;
}

const videoDelete: ActionDefinition<Input> = {
  key: "video-delete",
  type: "perform",
  resource: "video",
  title: "Delete Video",
  description: "Delete a finished video generation job. A job still in progress cannot be deleted.",
  idempotent: true,
  params: [{ key: "videoId", label: "Video job ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Video job ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<{ id?: string; deleted?: boolean }>(
      `/videos/${encodeURIComponent(input.videoId)}`,
      { method: "DELETE" },
    );
    return { id: res.id ?? input.videoId, deleted: res.deleted ?? true };
  },
};

export default videoDelete;
