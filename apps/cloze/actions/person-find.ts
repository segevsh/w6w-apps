import type { ActionDefinition } from "@w6w/types";
import { findParams, findRecords, PERSON } from "../lib/records.ts";

type Input = Record<string, unknown>;

const personFind: ActionDefinition<Input> = {
  key: "person-find",
  type: "search",
  resource: "person",
  title: "Find People",
  description:
    "Search your people with Cloze's query syntax or structured filters, one page at a time.",
  params: [...findParams(PERSON)],
  output: [
    { key: "items", type: "array", label: "People" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "availableCount", type: "number", label: "Total matching" },
    { key: "pageNumber", type: "number", label: "Page number" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return findRecords(ctx, PERSON, input);
  },
};

export default personFind;
