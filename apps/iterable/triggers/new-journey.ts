import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listJourneys from "../actions/list-journeys.ts";

export default pollFromListAction({
  key: "new-journey",
  title: "New Journey",
  description: "The run gets each newly created (non-archived) journey.",
  action: listJourneys,
  input: () => ({ page: 1, pageSize: 50, sort: "-createdAt" }),
  items: (result) => (result as { journeys?: unknown[] }).journeys ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Journey ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "createdAt", type: "number", label: "Created at" },
  ],
  sample: { id: 42, name: "Onboarding", enabled: false, createdAt: 1762768800000 },
  maxPages: 1,
});
