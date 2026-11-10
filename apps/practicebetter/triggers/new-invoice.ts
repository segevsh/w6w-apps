import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-invoices.ts";

/** `GET /consultant/payments/invoices`: "Invoices are returned in descending order, with the most recent invoices appearing first based on date created." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10). */
export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created invoice.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Invoice ID",
    },
    {
      "key": "dateCreated",
      "type": "string",
      "label": "Created at",
    },
    {
      "key": "currency",
      "type": "string",
      "label": "Currency",
    },
  ],
  sample: {
    "id": "inv-1",
    "dateCreated": "2026-11-10T09:00:00Z",
    "currency": "USD",
  },
  maxPages: 1,
});
