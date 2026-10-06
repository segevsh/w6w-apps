import { removeAction } from "../lib/factories.ts";

/** `POST /email_finder/list/remove` */
export default removeAction(
  "bulk-find-remove",
  "Remove Bulk Find List",
  "Delete a bulk email finder list and its result.",
  "/email_finder/list/remove",
);
