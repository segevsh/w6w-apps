import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listReviews from "../actions/list-reviews.ts";

// Newest first: `sortBy=id&sortOrder=desc` — `id` is one of the documented `sortBy` values and
// review ids only grow (https://api.hostaway.com/documentation, Retrieve reviews).
export default pollFromListAction({
  key: "new-review",
  title: "New Review",
  description: "The run gets each review newly created in Hostaway (newest first).",
  action: listReviews,
  input: () => ({ limit: 100, offset: 0, sortBy: "id", sortOrder: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Review ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "reservationId", type: "number", label: "Reservation ID" },
    { key: "type", type: "string", label: "guest-to-host or host-to-guest" },
    { key: "status", type: "string", label: "Review status" },
    { key: "rating", type: "number", label: "Rating" },
    { key: "publicReview", type: "string", label: "Public review text" },
  ],
  sample: {
    id: 2001,
    listingMapId: 1001,
    reservationId: 3001,
    type: "guest-to-host",
    status: "submitted",
    rating: 10,
    publicReview: "A lovely stay.",
  },
  maxPages: 1,
});
