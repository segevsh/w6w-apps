import type { TriggerDefinition } from "@w6w/types";
import contactListList from "../actions/contact-list-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * `GET /api/contact-lists` is a page-numbered list (0-based `page`, `size` up to 500) with no sort or date
 * filter — an account's contact-list records are a small bounded collection
 * (https://api-doc.simpletexting.com/, Get all Lists, verified 2026-11-10). Every check reads the whole
 * list through `contact-list-list` and diffs the ids (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-contact-list",
  title: "New Contact List",
  description: "The run gets each contact list newly created in the account.",
  output: [
    { key: "listId", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { listId: "5f6c760379f4e93135aac72b", name: "My First List", totalContactsCount: 0 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({
      state,
      items: await readAllPages(contactListList, ctx),
      idOf: (item) => (item as { listId?: unknown }).listId,
    });
  },
};

export default trigger;
