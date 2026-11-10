import { contactFeed } from "../lib/triggers.ts";

export default contactFeed({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Zoho Invoice contact that is created or edited.",
  sortColumn: "last_modified_time",
  idOf: (item) => `${item.contact_id ?? ""}:${item.last_modified_time ?? ""}`,
});
