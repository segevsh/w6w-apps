import { loadAll, snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/contact-list.ts";

// The contact list has no sort or created-since filter
// (https://docs.sayanchor.com/reference/listcontacts-1), so each check reads the whole account-
// sized collection (≤ 5000 rows) and diffs the ids.
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created client contact.",
  load: (_params, ctx) => loadAll(action, {}, ctx),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "companyName", type: "string", label: "Company name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "contact-101", companyName: "Acme LLC", email: "pat@example.com" },
});
