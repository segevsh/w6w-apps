import applicationFeedbackList from "../actions/application-feedback-list.ts";
import { sinceTrigger, stamp } from "../lib/triggers.ts";

/** Emits each interview feedback submission made since the previous successful check (`applicationFeedback.list` with `createdAfter`). The most sensitive data in the app: it is emitted, never logged. Brief 9.1 (b), 9.8, 9.9. */
export default sinceTrigger({
  key: "new-application-feedback",
  title: "New Application Feedback",
  description:
    "Emits each interview feedback submission made since the previous successful check (`applicationFeedback.list` with `createdAfter`). The most sensitive data in the app: it is emitted, never logged.",
  action: applicationFeedbackList,
  list: "submissions",
  tsOf: stamp("submittedAt"),
  output: [{ key: "id", type: "string", label: "Feedback ID" }, {
    key: "applicationId",
    type: "string",
    label: "Application ID",
  }, { key: "submittedAt", type: "string", label: "Submitted at" }],
  sample: { id: "fb-101", applicationId: "app-101", submittedAt: "2026-11-10T12:00:00.000Z" },
});
