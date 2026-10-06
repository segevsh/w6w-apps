import { progressAction } from "../lib/factories.ts";

/** `GET /email_finder/bulk/progress_status?list_id=` — note `percentage`, not `percentile`. */
export default progressAction(
  "bulk-find-status",
  "Get Bulk Find Progress",
  "Read the progress status and percent complete of a bulk email finder list.",
  "/email_finder/bulk/progress_status",
  "percentage",
);
