import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toIdList } from "../lib/client.ts";

/** `POST /api/client/v2/companies` — Update Company Lists. */
interface Input {
  companyIds: unknown;
  listIds?: unknown;
  listAction?: string;
}

const companiesListsUpdate: ActionDefinition<Input> = {
  key: "companies-lists-update",
  type: "perform",
  resource: "company",
  title: "Update Company Lists",
  description: "Add researched companies to lists, remove them, or replace their list membership.",
  idempotent: true,
  params: [
    {
      key: "companyIds",
      label: "Company IDs",
      type: "json",
      required: true,
      hint: "Integer company IDs.",
    },
    { key: "listIds", label: "List IDs", type: "json", hint: "Integer list IDs from list-list." },
    {
      key: "listAction",
      label: "List action",
      type: "select",
      options: [{ value: "add", label: "add" }, { value: "remove", label: "remove" }, {
        value: "replace",
        label: "replace",
      }],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "companyIds, skippedCompanyIds, listIds, listAction" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/companies", {
      body: compact({
        companyIds: need(toIdList(input.companyIds), "Company IDs"),
        listIds: toIdList(input.listIds),
        listAction: input.listAction,
      }),
    });
  },
};

export default companiesListsUpdate;
