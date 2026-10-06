import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";
import { renderOutput } from "../lib/params.ts";

interface Input {
  id: string | number;
}

/** `GET /videos/{id}` — the render record; `video_url` is null until `status` is `finished`. */
const action: ActionDefinition<Input, unknown> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Get Video",
  description: "Retrieve a video render by id to check its status and get the finished file URL.",
  params: [
    { key: "id", label: "Video ID", type: "string", required: true },
  ],
  output: [
    ...renderOutput("video_url"),
  ],

  async execute(input, ctx) {
    const id = required(input.id, "id");
    return await new PlacidClient(ctx).json(`/videos/${encodeURIComponent(id)}`);
  },
};

export default action;
