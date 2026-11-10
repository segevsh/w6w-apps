import { webhookTrigger } from "../lib/triggers.ts";

/** An avatar video fails to render (event type `avatar_video.fail`). */
const videoFailed = webhookTrigger({
  key: "video-failed",
  title: "Video Failed",
  description:
    "Fires when generating an avatar video fails on the HeyGen account. The run gets the event type and id, the video id and callback id where HeyGen sends them, and the full event data with the failure details.",
  eventType: "avatar_video.fail",
  sample: {
    eventType: "avatar_video.fail",
    eventId: "evt_abc124",
    createdAt: "2026-11-10T12:07:00Z",
    videoId: "vid_xyz790",
    videoUrl: null,
    videoPageUrl: null,
    callbackId: null,
    data: { video_id: "vid_xyz790", callback_id: null },
  },
});

export default videoFailed;
