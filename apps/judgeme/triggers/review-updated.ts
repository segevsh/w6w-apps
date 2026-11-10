import { webhookTrigger } from "../lib/triggers.ts";

/** A review is updated (webhook key `review/updated`). */
const reviewUpdated = webhookTrigger({
  key: "review-updated",
  title: "Review Updated",
  description:
    "Fires when a review is updated in Judge.me (webhook key review/updated): curated, pinned, moved to another product, edited, verified through a request email, or its photos shown or hidden. The run gets the webhook key, the review id when the payload carries one, and the full payload as Judge.me sent it.",
  webhookKey: "review/updated",
  sample: {
    key: "review/updated",
    reviewId: "123456",
    payload: { id: 123456 },
  },
});

export default reviewUpdated;
