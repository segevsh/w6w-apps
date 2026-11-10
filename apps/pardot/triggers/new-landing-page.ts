import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/landing-page-list.ts";

export default pollFromListAction({
  key: "new-landing-page",
  title: "New Landing Page",
  description: "The run gets each newly created landing page.",
  action,
  input: () => ({ orderBy: "-createdAt", limit: 100 }),
  items: (r) => (r as { values?: unknown[] }).values ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Landing Page ID" }],
  sample: { id: 1 },
  minIntervalMs: 300_000,
  maxPages: 1,
});
