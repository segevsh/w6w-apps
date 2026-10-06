import { downloadAction } from "../lib/factories.ts";

/** `POST /download/result` — the vendor's path for the Email Verifier result file. */
export default downloadAction(
  "bulk-verify-download",
  "Get Bulk Verify Result URL",
  "Request a download URL for the result file of a finished bulk email verification list.",
  "/download/result",
);
