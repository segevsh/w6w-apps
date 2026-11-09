import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly listed contact.",
  action: contactList,
  input: () => ({ page: 0, size: "100", sort: "created,desc" }),
  items: (result) =>
    Array.isArray((result as { content?: unknown[] }).content)
      ? (result as { content: unknown[] }).content
      : [],
  idOf: (item) =>
    String(
      (item as { phoneNumber?: unknown }).phoneNumber ?? (item as { id?: unknown }).id ?? "",
    ),
  output: [
    { key: "phoneNumber", type: "string", label: "Phone number" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: { phoneNumber: "5551230100", firstName: "Ada", createdAt: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
