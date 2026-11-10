import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import contactSearch from "../actions/contact-search.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created AccuLynx contact.",
  action: contactSearch as unknown as ActionDefinition,
  input: () => ({
    startDate: "1970-01-01T00:00:00Z",
    endDate: "9999-12-31T23:59:59Z",
    sortColumn: "CreatedDate",
    sortDirection: "Descending",
    pageSize: 25,
  }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-101", firstName: "Casey", lastName: "Example" },
});
