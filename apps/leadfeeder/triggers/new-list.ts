import type { TriggerDefinition } from "@w6w/types";
import listList from "../actions/list-list.ts";
import { accountIdParam } from "../lib/params.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a small bounded set of lists and GET /v1/lists has no sort or since filter.
 * Every check reads all pages through `list-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api.leadfeeder.com/openapi.yaml, `getLists` (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description:
    "The run gets each company or contact list newly created in the chosen Leadfeeder account.",
  params: [
    accountIdParam,
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "company",
      options: [{ value: "company", label: "Company lists" }, {
        value: "contact",
        label: "Contact lists",
      }],
      hint: "Which kind of list to watch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "List attributes" },
  ],
  sample: { id: "company_123", type: "list", attributes: { name: "Target accounts" } },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = params as { accountId: string; scope?: string };
    return newRecords({
      state,
      items: await readAllPages(
        listList,
        { accountId: p.accountId, scope: p.scope || "company" },
        ctx,
      ),
    });
  },
};

export default trigger;
