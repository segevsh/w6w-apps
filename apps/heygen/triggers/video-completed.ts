import { webhookTrigger } from "../lib/triggers.ts";

/** An avatar video finishes rendering (event type `avatar_video.success`). */
const videoCompleted = webhookTrigger({
  key: "video-completed",
  title: "Video Completed",
  description:
    "Fires when an avatar video finishes rendering on the HeyGen account. The run gets the video id, the pre-signed download URL (it expires, so fetch it promptly), the HeyGen page URL, the callback id you set when creating the video and the full event data.",
  eventType: "avatar_video.success",
  sample: {
    eventType: "avatar_video.success",
    eventId: "evt_abc123",
    createdAt: "2026-11-10T12:05:00Z",
    videoId: "vid_xyz789",
    videoUrl: "https://files.heygen.com/video/vid_xyz789.mp4",
    videoPageUrl: "https://app.heygen.com/videos/vid_xyz789",
    callbackId: null,
    data: {
      video_id: "vid_xyz789",
      url: "https://files.heygen.com/video/vid_xyz789.mp4",
      gif_download_url: "https://resource.heygen.ai/video/vid_xyz789/gif.gif",
      video_page_url: "https://app.heygen.com/videos/vid_xyz789",
      video_share_page_url: "https://app.heygen.com/share/vid_xyz789",
      folder_id: null,
      callback_id: null,
    },
  },
});

export default videoCompleted;
