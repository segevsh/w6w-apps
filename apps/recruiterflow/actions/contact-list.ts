import type { ActionDefinition } from "@w6w/types";
import { asList, call, compact, flag, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  itemsPerPage?: unknown;
  currentPage?: unknown;
  includeCount?: unknown;
  includeFiles?: unknown;
  includeNotes?: unknown;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  title: "List Contacts",
  description: "List contacts (people at client companies).",
  params: [
    { key: "itemsPerPage", label: "Items per page", type: "number", hint: "Records per page." },
    { key: "currentPage", label: "Page", type: "number", hint: "1-based page number." },
    {
      key: "includeCount",
      label: "Include total count",
      type: "boolean",
      hint: "Adds the total record count to the result.",
    },
    { key: "includeFiles", label: "Include files", type: "boolean" },
    { key: "includeNotes", label: "Include notes", type: "boolean" },
  ],
  output: [{ key: "items", type: "array", label: "Records" }, {
    key: "total",
    type: "number",
    label: "Total (with include_count)",
  }],

  async execute(input, ctx) {
    const query = compact({
      "items_per_page": toInt(input.itemsPerPage, "Items per page"),
      "current_page": toInt(input.currentPage, "Page"),
      "include_count": flag(input.includeCount),
      "include_files": flag(input.includeFiles),
      "include_notes": flag(input.includeNotes),
    }) as Record<string, QueryValue>;
    const res = await call(ctx, "/contact/list", { query });
    return asList(res);
  },
};

export default contactList;
