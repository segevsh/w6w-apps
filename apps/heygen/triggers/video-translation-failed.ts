import { webhookTrigger } from "../lib/triggers.ts";

/** A video translation fails (event type `video_translate.fail`). */
const videoTranslationFailed = webhookTrigger({
  key: "video-translation-failed",
  title: "Video Translation Failed",
  description:
    "Fires when a video translation fails on the HeyGen account. The run gets the event type and id and the full event data with the failure details.",
  eventType: "video_translate.fail",
  sample: {
    eventType: "video_translate.fail",
    eventId: "evt_abc126",
    createdAt: "2026-11-10T12:11:00Z",
    videoId: null,
    videoUrl: null,
    videoPageUrl: null,
    callbackId: null,
    data: {},
  },
});

export default videoTranslationFailed;
