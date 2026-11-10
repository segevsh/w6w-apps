import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

const PAGE = 500;
const CAP = 5000;

/**
 * Bounded snapshot of ONE list: `GET /v4/lists/{listname}/contacts` takes `limit` and `offset` only
 * (no created-since filter, no order; Elastic Email v4 OpenAPI), so the list's contacts are read
 * page by page until an empty page and diffed by email. A list of CAP or more contacts fails the
 * check with an error naming the cap rather than silently dropping rows. A contact removed and
 * added back is announced again.
 */
const trigger: TriggerDefinition<{ listName?: string }> = {
  key: "new-contact-in-list",
  title: "New Contact in List",
  description:
    "The run gets each contact newly added to the chosen Elastic Email list (lists of up to 5000 contacts).",
  params: [{
    key: "listName",
    label: "List name",
    type: "string",
    required: true,
    hint: "The list to watch, as shown by List Lists.",
  }],
  output: [
    { key: "Email", type: "string", label: "Email" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "Status", type: "string", label: "Status" },
    { key: "DateAdded", type: "string", label: "Date added" },
  ],
  sample: {
    Email: "jane@example.com",
    FirstName: "Jane",
    LastName: "Doe",
    Status: "Active",
    DateAdded: "2026-11-09T12:00:00",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const listName = params?.listName?.trim();
    if (!listName) throw new Error("List name is required");
    const contacts: Array<{ Email?: unknown }> = [];
    for (let offset = 0;; offset += PAGE) {
      const out = await listContacts.execute({ listName, limit: PAGE, offset }, ctx) as {
        items?: Array<{ Email?: unknown }>;
      };
      const page = Array.isArray(out?.items) ? out.items : [];
      if (page.length === 0) break;
      contacts.push(...page);
      if (contacts.length >= CAP) {
        throw new Error(
          `Elastic Email list has ${CAP} or more contacts; the New Contact in List trigger is capped there`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: contacts.map((contact) => ({ key: String(contact.Email ?? ""), values: contact })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
