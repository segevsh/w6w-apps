import action from "../actions/inbox-list.ts";
import { bounded } from "../lib/triggers.ts";

/** `GET /inboxes` — the company's inboxes, one request (https://dev.frontapp.com/reference/list-inboxes, verified 2026-11-10). */
export default bounded({
  key: "new-inbox",
  title: "New Inbox",
  description: "The run gets each inbox newly added to the Front company (checked on a schedule).",
  action,
  output: [
    { key: "id", type: "string", label: "Inbox ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_private", type: "boolean", label: "Private" },
  ],
  sample: { id: "inb_55c8c149", name: "Support", is_private: false },
});
