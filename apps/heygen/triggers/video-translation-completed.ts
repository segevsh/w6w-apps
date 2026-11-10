import { webhookTrigger } from "../lib/triggers.ts";

/** A video translation finishes (event type `video_translate.success`). */
const videoTranslationCompleted = webhookTrigger({
  key: "video-translation-completed",
  title: "Video Translation Completed",
  description:
    "Fires when a video translation finishes on the HeyGen account. The run gets the event type and id and the full event data; fetch the translation with Get Video Translation for the result.",
  eventType: "video_translate.success",
  sample: {
    eventType: "video_translate.success",
    eventId: "evt_abc125",
    createdAt: "2026-11-10T12:09:00Z",
    videoId: null,
    videoUrl: null,
    videoPageUrl: null,
    callbackId: null,
    data: {},
  },
});

export default videoTranslationCompleted;
