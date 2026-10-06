import { cancelAction } from "../lib/factories.ts";

/** `POST /email_verify/list/cancel` */
export default cancelAction(
  "bulk-verify-cancel",
  "Cancel Bulk Verify",
  "Cancel a running bulk email verification list.",
  "/email_verify/list/cancel",
);
