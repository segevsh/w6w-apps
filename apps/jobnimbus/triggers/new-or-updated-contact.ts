import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact that is new or has been edited since the last check, polled from the existing `contact-list` action sorted by `date_updated` descending.",
  action,
  input: () => ({ sort_field: "date_updated", sort_direction: "desc", size: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { jnid?: unknown }).jnid}:${(item as { date_updated?: unknown }).date_updated}`,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "jnid", type: "string", label: "JobNimbus ID" },
    { key: "date_created", type: "number", label: "Created (unix seconds)" },
    { key: "date_updated", type: "number", label: "Updated (unix seconds)" },
  ],
  sample: { jnid: "lq1abc", date_created: 1762682400, date_updated: 1762686000 },
  maxPages: 1,
});
