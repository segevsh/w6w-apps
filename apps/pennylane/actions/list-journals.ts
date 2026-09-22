import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, PennylaneClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /journals` — list the company's accounting journals.
 *
 * Pennylane's only filterable field here is `type` (the code's family —
 * `sales`, `purchases`, `payroll`, …), and `sort` accepts only `id`.
 */
const listJournals: ActionDefinition<ListInput> = {
  key: "list-journals",
  type: "read",
  resource: "journal",
  title: "List Journals",
  description:
    "List the company's accounting journals, one cursor page at a time (GET /journals). " +
    "Filterable on type.",
  params: listParams(100),
  output: [
    { key: "items", type: "array", label: "Journals" },
    { key: "has_more", type: "boolean", label: "More pages available" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request<ListEnvelope>("/journals", {
      query: listQuery(input),
    });
  },
};

export default listJournals;
