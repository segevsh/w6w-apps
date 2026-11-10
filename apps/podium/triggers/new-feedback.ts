import feedbackList from "../actions/feedback-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new feedback survey response, newest first (`GET /v4/feedback`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-feedback",
  title: "New Feedback",
  description: "The run gets each new feedback survey response, newest first (`GET /v4/feedback`).",
  action: feedbackList,
  output: [{ key: "uid", type: "string", label: "UID" }, {
    key: "createdAt",
    type: "string",
    label: "Created at",
  }],
  sample: { uid: "feedback_1", createdAt: "2026-11-10T12:00:00.000Z" },
});
