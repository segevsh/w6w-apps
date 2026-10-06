import { cancelAction } from "../lib/factories.ts";

/** `POST /email_finder/list/cancel` */
export default cancelAction(
  "bulk-find-cancel",
  "Cancel Bulk Find",
  "Cancel a running bulk email finder list.",
  "/email_finder/list/cancel",
);
