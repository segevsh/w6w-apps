import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description:
    "The run gets each newly created contact, oldest first, polled from the existing `contact-list` action sorted by `date_created` descending.",
  action,
  input: () => ({ sort_field: "date_created", sort_direction: "desc", size: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { jnid?: unknown }).jnid),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "jnid", type: "string", label: "JobNimbus ID" },
    { key: "date_created", type: "number", label: "Created (unix seconds)" },
    { key: "date_updated", type: "number", label: "Updated (unix seconds)" },
  ],
  sample: { jnid: "lq1abc", date_created: 1762682400, date_updated: 1762682400 },
  maxPages: 1,
});
