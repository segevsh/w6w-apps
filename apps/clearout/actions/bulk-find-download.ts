import { downloadAction } from "../lib/factories.ts";

/** `POST /email_finder/download/result` */
export default downloadAction(
  "bulk-find-download",
  "Get Bulk Find Result URL",
  "Request a download URL for the result file of a finished bulk email finder list.",
  "/email_finder/download/result",
);
