import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listJourneys from "../actions/list-journeys.ts";

export default pollFromListAction({
  key: "new-or-updated-journey",
  title: "New or Updated Journey",
  description: "The run gets each non-archived journey that is newly created or edited.",
  action: listJourneys,
  input: () => ({ page: 1, pageSize: 50, sort: "-updatedAt" }),
  items: (result) => (result as { journeys?: unknown[] }).journeys ?? [],
  idOf: (item) => {
    const j = item as { id?: unknown; updatedAt?: unknown };
    return `${String(j.id ?? "")}:${String(j.updatedAt ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Journey ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updatedAt", type: "number", label: "Updated at" },
  ],
  sample: { id: 42, name: "Onboarding", updatedAt: 1762855200000 },
  maxPages: 1,
});
