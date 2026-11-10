import { webhookTrigger } from "../lib/triggers.ts";

/** A review is created (webhook key `review/created`). */
const reviewCreated = webhookTrigger({
  key: "review-created",
  title: "New Review",
  description:
    "Fires when a review is created in Judge.me (webhook key review/created). The run gets the webhook key, the review id when the payload carries one, and the full payload as Judge.me sent it.",
  webhookKey: "review/created",
  sample: {
    key: "review/created",
    reviewId: "123456",
    payload: { id: 123456 },
  },
});

export default reviewCreated;
