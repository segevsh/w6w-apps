import type { ActionDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /api/v1/management/contacts` (Enterprise Edition) returns every contact of the
 * workspace's API key in one response: the handler calls `getContacts(workspaceIds)` with no
 * paging (https://github.com/formbricks/formbricks, apps/web/modules/ee/contacts/api/v1/management/contacts/route.ts),
 * so each check diffs the contact ids (the kit refuses more than 5000 contacts). */
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to the Formbricks workspace.",
  action: contactList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: { id: "clcontact123", userId: "user-1", createdAt: "2026-11-09T09:00:00.000Z" },
});
