import { contactFeed } from "../lib/triggers.ts";

export default contactFeed({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Zoho Books contact.",
  sortColumn: "created_time",
  idOf: (item) => String(item.contact_id ?? ""),
});
