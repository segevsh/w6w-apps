import { listListsAction } from "../lib/factories.ts";

/** `POST /email_finder/list` — the status filter is `processed` here, `verified` for the verifier. */
export default listListsAction(
  "list-finder-lists",
  "List Bulk Find Lists",
  "List bulk email finder lists with their result summaries, with cursor pagination.",
  "/email_finder/list",
  { field: "processed", values: ["non_processed", "processed", "in_progress", "cancelled"] },
  false,
);
