import type { TriggerDefinition } from "@w6w/types";
import listPeopleList from "../actions/list-people-list.ts";
import { readAllPages, snapshotAdded } from "../lib/triggers.ts";

/**
 * People on one custom list the user picks. `/lists/{id}/signups` documents no sort or filter, so
 * the whole membership is diffed; a list of 5000 or more people throws instead of guessing.
 */
const trigger: TriggerDefinition = {
  key: "new-person-on-list",
  title: "New Person on List",
  description: "The run gets each person newly added to the chosen custom list.",
  params: [{
    key: "listId",
    label: "List ID",
    type: "string",
    required: true,
    hint: "The custom list to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: {
    id: "101",
    type: "signups",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.org",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const listId = String((params as { listId?: unknown }).listId ?? "");
    if (!listId) throw new Error("new-person-on-list: listId is required");
    const rows = await readAllPages(async (pageNumber) => {
      const out = await listPeopleList.execute({ listId, pageSize: 100, pageNumber }, ctx) as {
        items?: Record<string, unknown>[];
      };
      return out.items ?? [];
    }, "new-person-on-list");
    return snapshotAdded(state, rows);
  },
};

export default trigger;
