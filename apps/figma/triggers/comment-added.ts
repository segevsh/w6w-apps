import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "comment-added",
  title: "Comment Added",
  description:
    "The run gets each comment left on a Figma file, with its text fragments and mentions.",
  eventType: "FILE_COMMENT",
  sample: {
    eventType: "FILE_COMMENT",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Developer page mockup demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "813845097374535682", handle: "Dylan Field" },
    data: {
      comment_id: "5001",
      comment: [{ text: "Looks good" }],
      mentions: [],
      parent_id: "",
      order_id: "7",
      created_at: "2026-11-09T12:00:00Z",
    },
  },
});
