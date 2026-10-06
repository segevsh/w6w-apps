import { progressAction } from "../lib/factories.ts";

/** `GET /email_verify/bulk/progress_status?list_id=` */
export default progressAction(
  "bulk-verify-status",
  "Get Bulk Verify Progress",
  "Read the progress status and percent complete of a bulk email verification list.",
  "/email_verify/bulk/progress_status",
  "percentile",
);
