import reviewList from "../actions/review-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new review, newest first (`GET /v4/reviews`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-review",
  title: "New Review",
  description: "The run gets each new review, newest first (`GET /v4/reviews`).",
  action: reviewList,
  output: [{ key: "uid", type: "string", label: "UID" }, {
    key: "createdAt",
    type: "string",
    label: "Created at",
  }, { key: "updatedAt", type: "string", label: "Updated at" }],
  sample: {
    uid: "review_1",
    createdAt: "2026-11-10T12:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
