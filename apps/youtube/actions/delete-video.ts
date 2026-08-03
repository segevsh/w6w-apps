import type { ActionDefinition } from "@w6w/types";
import { YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `videos.delete` — DELETE /youtube/v3/videos
 * https://developers.google.com/youtube/v3/docs/videos/delete
 *
 * **Quota: 50 units.**
 *
 * One of the few YouTube methods with no `part`: there is no response body to
 * shape and nothing to write, so `part` is neither required nor accepted here.
 *
 * Irreversible. There is no trash and no undelete — the video, its comments, its
 * view history and its analytics all go. `idempotent: true` is about retry
 * safety, not reversibility: a retried delete of an already-deleted video 404s
 * rather than destroying something else.
 */
const deleteVideo: ActionDefinition<Input> = {
  key: "delete-video",
  type: "perform",
  resource: "video",
  title: "Delete Video",
  description:
    "Permanently delete a video owned by the authenticated user. Costs 50 quota units. Irreversible — there is no undelete.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Video ID",
      type: "string",
      required: true,
      hint: "Must be a video the authenticated user owns.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    // Documented 204 with no body — surface a result the workflow can branch on
    // rather than an undefined.
    await client.request("/videos", { method: "DELETE", query: { id: input.id } });
    return { deleted: true };
  },
};

export default deleteVideo;
