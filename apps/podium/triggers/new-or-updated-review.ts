import reviewList from "../actions/review-list.ts";
import { updatedSinceTrigger } from "../lib/triggers.ts";

/** The run gets each review that is new or was updated, e.g. answered or edited (`GET /v4/reviews` with `updatedAt[gte]` = the last check minus a 2-minute overlap). Brief 9.1 (b), 9.2, 9.8, 9.9. */
export default updatedSinceTrigger({
  key: "new-or-updated-review",
  title: "New or Updated Review",
  description:
    "The run gets each review that is new or was updated, e.g. answered or edited (`GET /v4/reviews` with `updatedAt[gte]` = the last check minus a 2-minute overlap).",
  action: reviewList,
  sinceKey: "updatedAfter",
  output: [{ key: "uid", type: "string", label: "UID" }, {
    key: "createdAt",
    type: "string",
    label: "Created at",
  }, { key: "updatedAt", type: "string", label: "Updated at" }],
  sample: {
    uid: "review_1",
    createdAt: "2026-11-10T11:00:00.000Z",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
