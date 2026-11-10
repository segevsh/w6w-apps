import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/quote-list.ts";

/** Wraps `quote-list` sorted `CREATED_AT` descending (the `QuotesSortInput` key the action offers). */
export default pollFromListAction({
  key: "new-quote",
  title: "New Quote",
  description:
    "The run gets each newly created quote, polled from the existing `quote-list` action sorted by `CREATED_AT` descending.",
  action,
  input: () => ({ sortKey: "CREATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { quotes?: { nodes?: unknown[] } }).quotes?.nodes ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Quote ID" },
    { key: "quoteNumber", type: "number", label: "Quote number" },
    { key: "quoteStatus", type: "string", label: "Status" },
    { key: "title", type: "string", label: "Title" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL1F1b3RlLzE=",
    quoteNumber: 7,
    quoteStatus: "draft",
    title: "Garden redesign",
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
