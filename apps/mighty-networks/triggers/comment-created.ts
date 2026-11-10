import { webhookTrigger } from "../lib/triggers.ts";

/** Comment Created (the `CommentCreated` webhook event). */
const commentCreated = webhookTrigger({
  key: "comment-created",
  title: "Comment Created",
  description:
    "Fires when a comment is created on a post or other commentable content. The run gets the event id and time and the payload: the comment's id, text, author id, target (id and type), space id and permalink.",
  eventTypes: ["CommentCreated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "CommentCreated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 999,
      text: "Great post!",
      author_id: 67890,
      targetable_id: 12345,
      targetable_type: "Post",
      space_id: 111,
      reply_to_id: null,
      created_at: "2026-11-10T10:30:00Z",
      permalink: "https://community.example.com/comments/999",
    },
  },
});

export default commentCreated;
