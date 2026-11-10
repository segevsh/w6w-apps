import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-contacts.ts";

/** The Odoo ORM exposes `create_date` on every model (`_log_access`); `desc` is newest first. */
export const FIELDS = "id,name,email,phone,is_company,create_date,write_date";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact or company (`res.partner`).",
  action,
  input: () => ({ order: "create_date desc", fields: FIELDS, limit: 100, offset: 0 }),
  items: (r) => (r as { records?: unknown[] }).records ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "is_company", type: "boolean", label: "Is a company" },
    { key: "create_date", type: "string", label: "Created at (UTC)" },
    { key: "write_date", type: "string", label: "Last updated (UTC)" },
  ],
  sample: {
    id: 42,
    name: "Acme Corporation",
    email: "info@acme.example",
    phone: false,
    is_company: true,
    create_date: "2026-11-09 10:00:00",
    write_date: "2026-11-09 10:00:00",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
