import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** The `contacts` query takes no arguments and has no pagination in the documented API, so one
 * response is the whole list and each check diffs the contact emails (the kit refuses more than
 * 5000 contacts). https://docs.fireflies.ai/graphql-api/query/contacts */
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each person newly met with on Fireflies (a new contact).",
  action: contactList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  keyOf: (item) => String((item as { email?: unknown }).email ?? "").toLowerCase(),
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "last_meeting_date", type: "string", label: "Last meeting date" },
  ],
  sample: { email: "ada@example.com", name: "Ada", last_meeting_date: "2026-11-09T15:00:00.000Z" },
});
