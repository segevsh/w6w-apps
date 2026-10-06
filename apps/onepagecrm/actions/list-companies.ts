import type { ActionDefinition } from "@w6w/types";
import {
  listResult,
  OnePageClient,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SORT_ORDER_PARAM,
} from "../lib/client.ts";

interface Input extends PageInput {
  name?: string;
  phone?: string;
  letter?: string;
  sortBy?: string;
  order?: string;
}

/** `GET /companies` — the account's companies, sorted by name. Items are `{ company }` wrappers. */
const listCompanies: ActionDefinition<Input> = {
  key: "list-companies",
  type: "read",
  resource: "company",
  title: "List Companies",
  description: "List the account's companies, optionally filtered by name, phone or first letter.",
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "letter", label: "Starts with letter", type: "string" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: ["created_at", "modified_at", "name"].map((v) => ({ value: v, label: v })),
    },
    SORT_ORDER_PARAM,
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "items", type: "array", label: "Companies ({company})" },
    { key: "totalCount", type: "number", label: "Total matching" },
    { key: "page", type: "number", label: "Page" },
    { key: "perPage", type: "number", label: "Per page" },
    { key: "maxPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const data = await new OnePageClient(ctx).data("/companies", {
      query: {
        name: input.name,
        phone: input.phone,
        letter: input.letter,
        sort_by: input.sortBy,
        order: input.order,
        ...pageQuery(input),
      },
    });
    return listResult(data, "companies");
  },
};

export default listCompanies;
