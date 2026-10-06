import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";
import { shapeVideo, VIDEO_OUTPUT, type VideoBody } from "../lib/video.ts";

/** `GET /v3/videos/{video_id}` - poll until `status` is `completed` or `failed`. */
interface Input {
  videoId: string;
}

const videoGet: ActionDefinition<Input> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Get Video",
  description: "Get a video generation job's status and cost.",
  params: [{ key: "videoId", label: "Video job ID", type: "string", required: true }],
  output: VIDEO_OUTPUT,

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<VideoBody>(
      `/videos/${encodeURIComponent(input.videoId)}`,
    );
    return shapeVideo(res);
  },
};

export default videoGet;
