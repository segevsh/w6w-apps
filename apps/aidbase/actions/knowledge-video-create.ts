import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact } from "../lib/client.ts";

/**
 * Add Video Knowledge — Create a video knowledge item from a YouTube link.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  videoUrl: string;
  videoType: string;
}

const knowledgeVideoCreate: ActionDefinition<Input> = {
  key: "knowledge-video-create",
  type: "perform",
  resource: "knowledge",
  title: "Add Video Knowledge",
  description: "Create a video knowledge item from a YouTube link.",
  idempotent: false,
  params: [
    {
      "key": "videoUrl",
      "label": "Video URL",
      "type": "string",
      "required": true,
      "hint": "A YouTube link; Aidbase accepts nothing else yet.",
    },
    {
      "key": "videoType",
      "label": "Video type",
      "type": "select",
      "required": true,
      "hint": "Aidbase documents `YOUTUBE` as the only value.",
      "options": [
        {
          "value": "YOUTUBE",
          "label": "YOUTUBE",
        },
      ],
      "default": "YOUTUBE",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Knowledge item ID",
    },
    {
      "key": "type",
      "type": "string",
      "label": "video",
    },
    {
      "key": "video_id",
      "type": "string",
      "label": "YouTube video id",
    },
    {
      "key": "video_url",
      "type": "string",
      "label": "Video URL",
    },
    {
      "key": "video_type",
      "type": "string",
      "label": "YOUTUBE",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/video`, {
      method: "POST",
      body: compact({ video_url: input.videoUrl, video_type: input.videoType }),
    });
  },
};

export default knowledgeVideoCreate;
