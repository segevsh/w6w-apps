import type { TriggerDefinition } from "@w6w/types";
import listItems from "../actions/list-items.ts";
import { accountIdParam } from "../lib/params.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * The chosen list is a bounded set of bare references and GET /v1/lists/{id}/items documents cursor paging with no sort or since filter.
 * Every check reads all pages through `list-items` and diffs the ids (`pollSnapshot`, added only).
 * https://api.leadfeeder.com/openapi.yaml, `getListItems` (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-list-item",
  title: "New List Item",
  description: "The run gets each company or contact newly added to the chosen Leadfeeder list.",
  params: [
    accountIdParam,
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      hint: "Scope-prefixed list id, e.g. `company_123` (see List Lists).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Company or contact ID" },
    { key: "type", type: "string", label: "Type (company or contact)" },
  ],
  sample: { id: "159001425", type: "company" },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = params as { accountId: string; listId: string };
    return newRecords({
      state,
      items: await readAllPages(listItems, { accountId: p.accountId, id: p.listId }, ctx),
    });
  },
};

export default trigger;
