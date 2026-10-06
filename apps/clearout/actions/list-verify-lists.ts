import { listListsAction } from "../lib/factories.ts";

/** `POST /email_verify/list` — cursor pagination via `start_after` / `page_info.last_cursor`. */
export default listListsAction(
  "list-verify-lists",
  "List Bulk Verify Lists",
  "List bulk email verification lists, newest filters first, with cursor pagination.",
  "/email_verify/list",
  { field: "verified", values: ["non_verified", "verified", "in_progress", "cancelled"] },
  true,
);
