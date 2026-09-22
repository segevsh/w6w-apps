import type { ActionDefinition } from "@w6w/types";
import { asFlag, asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * Read one review. Wraps `GET /v1/reviews/{reviewId}`.
 *
 * Documented query parameter: `preview` — "When true, template variables in
 * `publicReview` and `privateFeedback` are replaced with their actual values."
 *
 * Response: "A review object." — the documented Review object carries `id`,
 * `listingMapId`, `reservationId`, `channelId`, `type` (`guest-to-host` /
 * `host-to-guest`), `status`, `rating`, `publicReview`, `privateFeedback`,
 * `revieweeResponse`, `isRevieweeRecommended`, `arrivalDate`, `departureDate`,
 * `listingName` and `guestName`.
 *
 * `preview` is the interesting default: without it the two prose fields come back with
 * their template variables unexpanded.
 */
const action: ActionDefinition = {
  key: "get-review",
  type: "read",
  resource: "review",
  title: "Get a review",
  description: "Show one review, optionally with its template variables expanded.",
  params: [
    { key: "reviewId", label: "Review ID", type: "number", required: true },
    {
      key: "preview",
      label: "Preview",
      type: "boolean",
      hint: "Replace template variables in publicReview and privateFeedback with real values.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Review ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "reservationId", type: "number", label: "Reservation ID" },
    { key: "type", type: "string", label: "Review type" },
    { key: "status", type: "string", label: "Status" },
    { key: "rating", type: "number", label: "Rating" },
    { key: "publicReview", type: "string", label: "Public review" },
    { key: "privateFeedback", type: "string", label: "Private feedback" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reviewId = asNumber(p.reviewId);
    if (reviewId === undefined) throw new Error("`reviewId` is required");
    return await new HostawayClient(ctx).request(`/reviews/${segment(reviewId)}`, {
      query: { preview: asFlag(p.preview) },
    });
  },
};

export default action;
