import { removeAction } from "../lib/factories.ts";

/** `POST /email_verify/list/remove` */
export default removeAction(
  "bulk-verify-remove",
  "Remove Bulk Verify List",
  "Delete a bulk email verification list and its result.",
  "/email_verify/list/remove",
);
