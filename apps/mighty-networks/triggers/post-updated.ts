import { webhookTrigger } from "../lib/triggers.ts";

/** Post Updated (the `PostUpdated` webhook event). */
const postUpdated = webhookTrigger({
  key: "post-updated",
  title: "Post Updated",
  description:
    "Fires when a post is updated in a space. The run gets the event id and time and the payload: the post's id, title, summary, description, type, status, space id, creator id and permalink.",
  eventTypes: ["PostUpdated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "PostUpdated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 12345,
      title: "Example post title",
      summary: "Example summary",
      post_type: "basic",
      status: "published",
      creator_id: 67890,
      space_id: 111,
      updated_at: "2026-11-10T10:30:00Z",
      permalink: "https://community.example.com/posts/12345",
    },
  },
});

export default postUpdated;
