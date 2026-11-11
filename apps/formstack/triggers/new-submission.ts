import { submissionWebhook } from "../lib/triggers.ts";

export default { ...submissionWebhook, key: "new-submission" };
