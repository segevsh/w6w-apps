import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-domains.ts";

const trigger = pollFromListAction({
  key: "new-domain",
  title: "New Domain",
  description: "Fires for newly added sending domains.",
  action,
  input: () => ({ page: 1, perPage: 100, sortBy: "id", sortDir: "desc" }),
  items: (result) => (result as { domains?: unknown[] }).domains ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [{ key: "id", type: "string", label: "Domain ID" }],
  sample: { id: "domain-1" },
  maxPages: 1,
});

export default trigger;
